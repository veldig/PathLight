"""
Autonomous form-filling agent.
Pipeline: Playwright navigates → extract fields → Claude maps profile → fill → screenshot.
Two-phase: preview (fill without submit) and confirm (re-fill + click submit).
"""
from __future__ import annotations
import asyncio
import base64
import json
import os
import re
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

_BROWSER_ARGS = ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]


# ─── Public API ──────────────────────────────────────────────────────────────

async def preview(url: str, profile: dict) -> dict:
    """
    Navigate to url, fill the form with profile data, take screenshot.
    Does NOT click submit. Returns filled values + screenshot for user review.
    """
    return await _run(url, profile, submit=False)


async def confirm_and_submit(url: str, profile: dict, filled_values: list[dict]) -> dict:
    """
    Re-navigate, re-fill using the confirmed values, then click submit.
    Returns the confirmation page screenshot.
    """
    return await _run(url, profile, submit=True, override_values=filled_values)


# ─── Core Agent Loop ─────────────────────────────────────────────────────────

async def _run(url: str, profile: dict, submit: bool, override_values: list[dict] | None = None) -> dict:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return _fallback_no_playwright(url, profile)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=_BROWSER_ARGS)
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        page = await ctx.new_page()

        try:
            await page.goto(url, timeout=25000, wait_until="domcontentloaded")
            await page.wait_for_timeout(2500)

            # Detect login walls / CAPTCHAs before proceeding
            gate = await _detect_gate(page)
            if gate:
                screenshot = base64.b64encode(await page.screenshot()).decode()
                return {
                    "status": "gate_detected",
                    "gate_type": gate,
                    "message": _gate_message(gate),
                    "url": url,
                    "screenshot": screenshot,
                    "quick_answers": _build_quick_answers(profile),
                }

            fields = await _extract_fields(page)

            if not fields:
                screenshot = base64.b64encode(await page.screenshot()).decode()
                return {
                    "status": "no_form",
                    "message": "No application form was found on this page. It may require account creation first.",
                    "url": url,
                    "screenshot": screenshot,
                    "quick_answers": _build_quick_answers(profile),
                }

            # Map profile → fields (use override if confirmed values provided)
            if override_values:
                mapped = override_values
            else:
                screenshot_b64 = base64.b64encode(await page.screenshot()).decode()
                mapped = _claude_map(fields, profile, screenshot_b64)

            filled_count = await _fill(page, mapped)

            if submit:
                submitted, conf_screenshot = await _submit_form(page)
                return {
                    "status": "submitted" if submitted else "submit_failed",
                    "fields_filled": filled_count,
                    "screenshot": conf_screenshot,
                    "message": "Application submitted successfully!" if submitted else "Could not click submit — please complete manually.",
                }
            else:
                screenshot = base64.b64encode(await page.screenshot(full_page=True)).decode()
                return {
                    "status": "ready_for_review",
                    "url": url,
                    "fields_found": len(fields),
                    "fields_filled": filled_count,
                    "filled_values": mapped,
                    "screenshot": screenshot,
                }

        except Exception as exc:
            try:
                screenshot = base64.b64encode(await page.screenshot()).decode()
            except Exception:
                screenshot = ""
            return {
                "status": "error",
                "error": str(exc),
                "url": url,
                "screenshot": screenshot,
                "quick_answers": _build_quick_answers(profile),
            }
        finally:
            await browser.close()


# ─── Field Extraction ─────────────────────────────────────────────────────────

async def _extract_fields(page) -> list[dict]:
    return await page.evaluate("""() => {
        const visible = (el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        };
        const getLabel = (el) => {
            if (el.id) {
                const lbl = document.querySelector('label[for="' + el.id + '"]');
                if (lbl) return lbl.innerText.trim().slice(0, 80);
            }
            const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '';
            if (aria) return aria.slice(0, 80);
            if (el.placeholder) return el.placeholder.slice(0, 80);
            const parent = el.closest('.form-group, .field, .question, li, td, p');
            if (parent) {
                const clone = parent.cloneNode(true);
                clone.querySelectorAll('input,select,textarea,button').forEach(c => c.remove());
                const txt = clone.innerText.trim().slice(0, 80);
                if (txt) return txt;
            }
            return el.name || el.id || '';
        };

        const skip = new Set(['hidden','submit','button','image','reset','file']);
        const fields = [];
        for (const el of document.querySelectorAll('input, textarea, select')) {
            if (skip.has(el.type) || !visible(el)) continue;
            const id = el.id || null;
            const name = el.name || null;
            if (!id && !name) continue;
            fields.push({
                id,
                name,
                type: el.tagName === 'TEXTAREA' ? 'textarea'
                    : el.tagName === 'SELECT' ? 'select'
                    : (el.type || 'text'),
                label: getLabel(el),
                placeholder: el.placeholder || '',
                required: el.required,
                options: el.tagName === 'SELECT'
                    ? Array.from(el.options).map(o => o.text).filter(t => t.trim()).slice(0, 15)
                    : [],
            });
        }
        return fields;
    }""")


# ─── Claude Field Mapping ─────────────────────────────────────────────────────

def _claude_map(fields: list[dict], profile: dict, screenshot_b64: str) -> list[dict]:
    safe_profile = {
        k: v for k, v in profile.items()
        if k not in ("id", "embedding", "created_at", "updated_at")
    }
    prompt = (
        f"You are an autonomous agent filling out an application form for a single parent.\n\n"
        f"User profile:\n{json.dumps(safe_profile, indent=2)}\n\n"
        f"Form fields found on page:\n{json.dumps(fields, indent=2)}\n\n"
        "For each field, determine the best value from the user's profile.\n"
        "Rules:\n"
        "- Use actual values from the profile (real name, state, field of study, etc.)\n"
        "- For essay/personal statement fields: write 2–3 genuine sentences using their actual details\n"
        "- For dropdown (select) fields: choose the closest option from the options list\n"
        "- For fields with no matching profile data: use empty string ''\n"
        "- Skip file upload fields\n"
        "Return ONLY a JSON array: [{\"id\": \"...\", \"name\": \"...\", \"value\": \"...\"}]\n"
        "No markdown, no extra text."
    )

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw.strip())
    except Exception:
        return _rule_based_map(fields, profile)


def _rule_based_map(fields: list[dict], profile: dict) -> list[dict]:
    name_parts = (profile.get("name") or "").split()
    result = []
    for f in fields:
        label = ((f.get("label") or "") + " " + (f.get("name") or "") + " " + (f.get("placeholder") or "")).lower()
        value = ""

        if re.search(r"first.?name|given.?name", label):
            value = name_parts[0] if name_parts else ""
        elif re.search(r"last.?name|surname|family.?name", label):
            value = name_parts[-1] if len(name_parts) > 1 else ""
        elif re.search(r"\bname\b", label):
            value = profile.get("name", "")
        elif "email" in label:
            value = profile.get("email", "")
        elif "phone" in label or "tel" in label:
            value = profile.get("phone", "")
        elif "state" in label and "status" not in label:
            value = profile.get("state", "")
        elif re.search(r"major|field.?of.?study|program|course", label):
            value = profile.get("field_of_study", "")
        elif re.search(r"education|degree|level", label):
            value = profile.get("education_level", "")
        elif re.search(r"income|salary|earnings", label):
            value = profile.get("income_bracket", "")
        elif re.search(r"family.?size|household.?size|dependents", label):
            value = str(profile.get("family_size", ""))
        elif re.search(r"skill|expertise|experience", label):
            value = ", ".join(profile.get("skills") or [])
        elif re.search(r"hours|availability|schedule", label):
            value = str(profile.get("hours_per_week", ""))

        if f.get("id") or f.get("name"):
            result.append({"id": f.get("id"), "name": f.get("name"), "value": value})

    return result


# ─── Form Filling ─────────────────────────────────────────────────────────────

async def _fill(page, mapped: list[dict]) -> int:
    filled = 0
    for fv in mapped:
        if not fv.get("value"):
            continue
        selector = f"#{fv['id']}" if fv.get("id") else (f"[name='{fv['name']}']" if fv.get("name") else None)
        if not selector:
            continue
        try:
            el = page.locator(selector).first
            tag = await el.evaluate("el => el.tagName.toLowerCase()")
            el_type = await el.get_attribute("type") or ""
            if tag == "select":
                await el.select_option(label=str(fv["value"]))
            elif el_type in ("checkbox", "radio"):
                val = str(fv["value"]).lower()
                if val in ("true", "yes", "1"):
                    await el.check()
            else:
                await el.fill(str(fv["value"]))
            filled += 1
        except Exception:
            pass
    return filled


# ─── Submit ───────────────────────────────────────────────────────────────────

async def _submit_form(page) -> tuple[bool, str]:
    try:
        submit_btn = page.locator(
            'button[type="submit"], input[type="submit"], '
            'button:has-text("Submit"), button:has-text("Apply"), '
            'button:has-text("Send"), button:has-text("Next")'
        ).first
        await submit_btn.click(timeout=5000)
        await page.wait_for_timeout(3000)
        screenshot = base64.b64encode(await page.screenshot()).decode()
        return True, screenshot
    except Exception:
        screenshot = base64.b64encode(await page.screenshot()).decode()
        return False, screenshot


# ─── Gate Detection ───────────────────────────────────────────────────────────

async def _detect_gate(page) -> str | None:
    content = (await page.content()).lower()
    url = page.url.lower()
    if any(k in content for k in ["captcha", "recaptcha", "hcaptcha", "i am not a robot"]):
        return "captcha"
    if any(k in content for k in ["sign in to apply", "log in to continue", "create an account to apply", "login required"]):
        return "login_required"
    if any(k in url for k in ["login", "signin", "auth", "sso"]):
        return "login_page"
    return None


def _gate_message(gate: str) -> str:
    messages = {
        "captcha": "This application has a CAPTCHA that blocks automated filling. Use the Quick Answer Sheet below to fill it manually.",
        "login_required": "This application requires you to create an account first. Use the Quick Answer Sheet to have your answers ready.",
        "login_page": "This page requires login before the form is accessible. Use the Quick Answer Sheet to fill it manually after logging in.",
    }
    return messages.get(gate, "Automated filling was blocked. Use the Quick Answer Sheet to fill it manually.")


# ─── Fallback Quick Answer Sheet ─────────────────────────────────────────────

def _build_quick_answers(profile: dict) -> dict:
    name = profile.get("name", "")
    name_parts = name.split()
    return {
        "Full Name": name,
        "First Name": name_parts[0] if name_parts else "",
        "Last Name": name_parts[-1] if len(name_parts) > 1 else "",
        "Email": profile.get("email", ""),
        "State": profile.get("state", ""),
        "Field of Study / Major": profile.get("field_of_study", ""),
        "Education Level": profile.get("education_level", ""),
        "Income Bracket": profile.get("income_bracket", ""),
        "Family Size": str(profile.get("family_size", "")),
        "Skills": ", ".join(profile.get("skills") or []),
        "Hours Available per Week": str(profile.get("hours_per_week", "")),
        "Childcare Needed": "Yes" if profile.get("childcare_needed") else "No",
        "Why I Qualify (short)": (
            f"I am a single parent with {profile.get('family_size', 2)} family members, "
            f"studying {profile.get('field_of_study', 'my field')} at {profile.get('education_level', 'the college level')}. "
            f"My income bracket is {profile.get('income_bracket', 'low income')}, and I am committed to improving "
            f"my family's future through education."
        ),
    }


def _fallback_no_playwright(url: str, profile: dict) -> dict:
    return {
        "status": "playwright_unavailable",
        "message": "Browser automation is starting up (first-run model download). Try again in 30 seconds, or use the Quick Answer Sheet below.",
        "url": url,
        "quick_answers": _build_quick_answers(profile),
    }
