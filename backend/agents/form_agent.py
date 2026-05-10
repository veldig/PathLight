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

_JOB_SITE_PATTERNS = [
    "indeed.com", "linkedin.com", "usajobs.gov", "glassdoor.com",
    "monster.com", "themuse.com", "remoteok.com", "arbeitnow.com",
    "idealist.org", "careerbuilder.com", "flexjobs.com", "ziprecruiter.com",
]

_SCHOLARSHIP_SITE_PATTERNS = [
    "studentaid.gov", "fastweb.com", "scholarships.com", "spsf.org",
    "soroptimist.org", "hsf.net", "rankinfoundation.org", "gates", "aauw.org",
]


# ─── Public API ──────────────────────────────────────────────────────────────

async def preview(url: str, profile: dict) -> dict:
    return await _run(url, profile, submit=False)


async def confirm_and_submit(url: str, profile: dict, filled_values: list[dict]) -> dict:
    return await _run(url, profile, submit=True, override_values=filled_values)


# ─── Core Agent Loop ─────────────────────────────────────────────────────────

async def _run(url: str, profile: dict, submit: bool, override_values: list[dict] | None = None) -> dict:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return _fallback_no_playwright(url, profile)

    form_type = _detect_form_type(url)

    try:
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
                await page.goto(url, timeout=30000, wait_until="domcontentloaded")
                await page.wait_for_timeout(2500)

                gate = await _detect_gate(page)
                if gate:
                    screenshot = base64.b64encode(await page.screenshot()).decode()
                    return {
                        "status": "gate_detected",
                        "gate_type": gate,
                        "message": _gate_message(gate),
                        "url": url,
                        "screenshot": screenshot,
                        "quick_answers": _build_quick_answers(profile, form_type),
                    }

                total_filled = 0
                all_mapped: list[dict] = []
                pages_filled = 0
                max_pages = 5

                while pages_filled < max_pages:
                    fields = await _extract_fields(page)

                    if not fields and pages_filled == 0:
                        screenshot = base64.b64encode(await page.screenshot()).decode()
                        return {
                            "status": "no_form",
                            "message": "No application form was found on this page. It may require account creation first.",
                            "url": url,
                            "screenshot": screenshot,
                            "quick_answers": _build_quick_answers(profile, form_type),
                        }

                    if not fields:
                        break

                    if override_values and pages_filled == 0:
                        mapped = override_values
                    else:
                        screenshot_b64 = base64.b64encode(await page.screenshot()).decode()
                        mapped = _claude_map(fields, profile, screenshot_b64, form_type)

                    filled_count = await _fill(page, mapped)
                    total_filled += filled_count
                    all_mapped.extend(mapped)
                    pages_filled += 1

                    if not submit:
                        break
                    next_btn = await _find_next_button(page)
                    if not next_btn:
                        break
                    try:
                        await next_btn.click(timeout=5000)
                        await page.wait_for_timeout(2000)
                    except Exception:
                        break

                if submit:
                    submitted, conf_screenshot = await _submit_form(page)
                    return {
                        "status": "submitted" if submitted else "submit_failed",
                        "fields_filled": total_filled,
                        "pages_filled": pages_filled,
                        "screenshot": conf_screenshot,
                        "message": "Application submitted successfully!" if submitted else "Could not click submit — please complete manually.",
                    }
                else:
                    screenshot = base64.b64encode(await page.screenshot(full_page=True)).decode()
                    seen_ids: set = set()
                    unique_mapped = []
                    for fv in all_mapped:
                        key = fv.get("id") or fv.get("name")
                        if key and key not in seen_ids:
                            seen_ids.add(key)
                            unique_mapped.append(fv)
                    return {
                        "status": "ready_for_review",
                        "url": url,
                        "form_type": form_type,
                        "fields_found": len(fields) if fields else 0,
                        "fields_filled": total_filled,
                        "filled_values": unique_mapped,
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
                    "quick_answers": _build_quick_answers(profile, form_type),
                }
            finally:
                await browser.close()

    except Exception:
        return _fallback_no_playwright(url, profile)


# ─── Form Type Detection ──────────────────────────────────────────────────────

def _detect_form_type(url: str) -> str:
    url_lower = url.lower()
    if any(p in url_lower for p in _JOB_SITE_PATTERNS):
        return "job"
    if any(p in url_lower for p in _SCHOLARSHIP_SITE_PATTERNS):
        return "scholarship"
    return "general"


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
                if (lbl) return lbl.innerText.trim().slice(0, 100);
            }
            const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '';
            if (aria) return aria.slice(0, 100);
            if (el.placeholder) return el.placeholder.slice(0, 100);
            const parent = el.closest('.form-group, .field, .question, li, td, p, div[class*="field"], div[class*="input"]');
            if (parent) {
                const clone = parent.cloneNode(true);
                clone.querySelectorAll('input,select,textarea,button').forEach(c => c.remove());
                const txt = clone.innerText.trim().slice(0, 100);
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
                rows: el.rows || 1,
                options: el.tagName === 'SELECT'
                    ? Array.from(el.options).map(o => o.text).filter(t => t.trim()).slice(0, 20)
                    : [],
            });
        }
        return fields;
    }""")


async def _find_next_button(page):
    """Find a Next/Continue button on multi-page forms."""
    try:
        btn = page.locator(
            'button:has-text("Next"), button:has-text("Continue"), '
            'button:has-text("Proceed"), input[value="Next"], input[value="Continue"]'
        ).first
        if await btn.is_visible():
            return btn
    except Exception:
        pass
    return None


# ─── Claude Field Mapping ─────────────────────────────────────────────────────

def _claude_map(fields: list[dict], profile: dict, screenshot_b64: str, form_type: str = "general") -> list[dict]:
    safe_profile = {
        k: v for k, v in profile.items()
        if k not in ("id", "embedding", "created_at", "updated_at")
    }

    # Pre-generate cover letter / personal statement for job applications
    cover_letter = ""
    if form_type == "job":
        cover_letter = _generate_cover_letter(profile)
    personal_statement = _generate_personal_statement(profile, form_type)

    # Check if any field looks like a long-form text area
    has_essay_field = any(
        f.get("type") == "textarea" or (f.get("rows", 1) or 1) > 3
        or re.search(r"cover.?letter|personal.?statement|essay|why.?qualify|motivation|background|experience|summary|objective", (f.get("label") or "").lower())
        for f in fields
    )

    prompt = (
        f"You are an autonomous agent filling out a {'job application' if form_type == 'job' else 'scholarship/grant application'} "
        f"for a single parent.\n\n"
        f"User profile:\n{json.dumps(safe_profile, indent=2)}\n\n"
    )

    if has_essay_field:
        if form_type == "job":
            prompt += f"Pre-generated cover letter (use for cover letter / summary fields):\n{cover_letter}\n\n"
        prompt += f"Pre-generated personal statement (use for essay / why you qualify fields):\n{personal_statement}\n\n"

    prompt += (
        f"Form fields on page:\n{json.dumps(fields, indent=2)}\n\n"
        "For each field, determine the best value from the user's profile.\n"
        "Rules:\n"
        "- Use actual values from the profile (real name, state, field of study, etc.)\n"
        "- For cover letter / cover_letter fields: use the pre-generated cover letter\n"
        "- For personal statement / essay / 'why you qualify' fields: use the pre-generated personal statement\n"
        "- For summary / objective fields: write 1–2 sentences from the profile\n"
        "- For dropdown (select) fields: choose the closest matching option from the options list\n"
        "- For checkbox/radio: return 'true' if it represents a true condition for this user, else ''\n"
        "- For fields with no matching profile data: use empty string ''\n"
        "- For GPA fields: use '3.0' if not in profile\n"
        "Return ONLY a JSON array: [{\"id\": \"...\", \"name\": \"...\", \"value\": \"...\"}]\n"
        "No markdown, no extra text."
    )

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw.strip())
    except Exception:
        return _rule_based_map(fields, profile, form_type)


def _generate_cover_letter(profile: dict) -> str:
    name = profile.get("name", "Applicant")
    field = profile.get("field_of_study", "my field")
    skills = ", ".join((profile.get("skills") or [])[:4]) or "communication, organization, and problem-solving"
    education = profile.get("education_level", "undergraduate student")
    hours = profile.get("hours_per_week", 20)
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": (
                    f"Write a professional cover letter paragraph (3-4 sentences) for a job application. "
                    f"Applicant: {name}, {education}, studying {field}. "
                    f"Skills: {skills}. Available {hours} hours/week. "
                    f"Single parent demonstrating dedication and work ethic. "
                    f"Do not include salutation, date, or signature — just the body paragraph."
                ),
            }],
        )
        return response.content[0].text.strip()
    except Exception:
        return (
            f"I am {name}, a dedicated {education} with experience in {field}. "
            f"My skills include {skills}, and I am committed to contributing meaningfully while balancing "
            f"family responsibilities. I am available {hours} hours per week and thrive in flexible work environments."
        )


def _generate_personal_statement(profile: dict, form_type: str) -> str:
    name = profile.get("name", "Applicant")
    field = profile.get("field_of_study", "my chosen field")
    education = profile.get("education_level", "college")
    income = profile.get("income_bracket", "low income")
    family_size = profile.get("family_size", 2)
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=350,
            messages=[{
                "role": "user",
                "content": (
                    f"Write a compelling 3-sentence personal statement for a {'scholarship' if form_type == 'scholarship' else 'grant'} application. "
                    f"Applicant: {name}, single parent with {family_size} family members, studying {field} at the {education} level. "
                    f"Income: {income}. Highlight resilience, commitment to education, and impact on their family's future. "
                    f"Be genuine and specific. Do not start with 'I am writing to'."
                ),
            }],
        )
        return response.content[0].text.strip()
    except Exception:
        return (
            f"As a single parent pursuing {field} at the {education} level, I am deeply committed to "
            f"creating a better future for my family. Despite financial challenges as a {income} household, "
            f"I have maintained my academic progress and demonstrate the resilience and dedication that "
            f"this opportunity requires."
        )


def _rule_based_map(fields: list[dict], profile: dict, form_type: str = "general") -> list[dict]:
    name_parts = (profile.get("name") or "").split()
    cover_letter = _generate_cover_letter(profile) if form_type == "job" else ""
    personal_statement = _generate_personal_statement(profile, form_type)
    result = []

    for f in fields:
        label = (
            (f.get("label") or "") + " " +
            (f.get("name") or "") + " " +
            (f.get("placeholder") or "")
        ).lower()
        value = ""

        if re.search(r"first.?name|given.?name", label):
            value = name_parts[0] if name_parts else ""
        elif re.search(r"last.?name|surname|family.?name", label):
            value = name_parts[-1] if len(name_parts) > 1 else ""
        elif re.search(r"\bname\b", label):
            value = profile.get("name", "")
        elif "email" in label:
            value = profile.get("email", "")
        elif re.search(r"phone|tel|mobile", label):
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
        elif re.search(r"skill|expertise|proficien", label):
            value = ", ".join(profile.get("skills") or [])
        elif re.search(r"hours|availability|schedule|per.?week", label):
            value = str(profile.get("hours_per_week", ""))
        elif re.search(r"cover.?letter|covering.?letter", label):
            value = cover_letter
        elif re.search(r"personal.?statement|essay|motivation|why.?qualify|why.?apply|background", label):
            value = personal_statement
        elif re.search(r"summary|objective|about.?you|about.?yourself", label):
            value = personal_statement[:200]
        elif re.search(r"gpa|grade.?point", label):
            value = "3.0"
        elif re.search(r"zip|postal.?code", label):
            value = profile.get("zip_code", "")
        elif re.search(r"city", label):
            value = profile.get("city", "")
        elif re.search(r"childcare|child.?care", label):
            value = "Yes" if profile.get("childcare_needed") else "No"
        elif re.search(r"single.?parent|head.?of.?household", label):
            value = "Yes"

        if f.get("id") or f.get("name"):
            result.append({"id": f.get("id"), "name": f.get("name"), "value": value})

    return result


# ─── Form Filling ─────────────────────────────────────────────────────────────

async def _fill(page, mapped: list[dict]) -> int:
    filled = 0
    for fv in mapped:
        if not fv.get("value"):
            continue
        selector = (
            f"#{fv['id']}" if fv.get("id")
            else (f"[name='{fv['name']}']" if fv.get("name") else None)
        )
        if not selector:
            continue
        try:
            el = page.locator(selector).first
            tag = await el.evaluate("el => el.tagName.toLowerCase()")
            el_type = (await el.get_attribute("type") or "").lower()
            if tag == "select":
                try:
                    await el.select_option(label=str(fv["value"]))
                except Exception:
                    # Fallback: try by value
                    try:
                        await el.select_option(value=str(fv["value"]))
                    except Exception:
                        pass
            elif el_type == "checkbox":
                val = str(fv["value"]).lower()
                if val in ("true", "yes", "1", "on"):
                    await el.check()
            elif el_type == "radio":
                val = str(fv["value"]).lower()
                if val in ("true", "yes", "1"):
                    await el.check()
            elif tag == "textarea":
                await el.fill(str(fv["value"]))
                filled += 1
                continue
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
            'button:has-text("Submit"), button:has-text("Apply Now"), '
            'button:has-text("Apply"), button:has-text("Send Application"), '
            'button:has-text("Send"), button:has-text("Finish")'
        ).first
        await submit_btn.click(timeout=8000)
        await page.wait_for_timeout(3500)
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
    if any(k in content for k in ["sign in to apply", "log in to continue", "create an account to apply", "login required", "please sign in"]):
        return "login_required"
    if any(k in url for k in ["login", "signin", "auth", "sso", "oauth"]):
        return "login_page"
    return None


def _gate_message(gate: str) -> str:
    messages = {
        "captcha": "This application has a CAPTCHA that blocks automated filling. Use the Quick Answer Sheet below to fill it manually.",
        "login_required": "This application requires you to create an account first. Use the Quick Answer Sheet to have your answers ready.",
        "login_page": "This page requires login before the form is accessible. Use the Quick Answer Sheet to fill it manually after logging in.",
    }
    return messages.get(gate, "Automated filling was blocked. Use the Quick Answer Sheet to fill it manually.")


# ─── Quick Answer Sheet ───────────────────────────────────────────────────────

def _build_quick_answers(profile: dict, form_type: str = "general") -> dict:
    name = profile.get("name", "")
    name_parts = name.split()
    answers = {
        "Full Name": name,
        "First Name": name_parts[0] if name_parts else "",
        "Last Name": name_parts[-1] if len(name_parts) > 1 else "",
        "Email": profile.get("email", ""),
        "Phone": profile.get("phone", ""),
        "State": profile.get("state", ""),
        "Field of Study / Major": profile.get("field_of_study", ""),
        "Education Level": profile.get("education_level", ""),
        "Income Bracket": profile.get("income_bracket", ""),
        "Family Size": str(profile.get("family_size", "")),
        "Skills": ", ".join(profile.get("skills") or []),
        "Hours Available per Week": str(profile.get("hours_per_week", "")),
        "Childcare Needed": "Yes" if profile.get("childcare_needed") else "No",
        "Single Parent": "Yes",
    }
    if form_type == "job":
        answers["Cover Letter"] = _generate_cover_letter(profile)
        answers["Why This Role"] = (
            f"I am passionate about contributing my skills in {profile.get('field_of_study', 'my field')} "
            f"and am available {profile.get('hours_per_week', 20)} hours per week. "
            f"I thrive in flexible work environments and am a reliable, committed professional."
        )
    else:
        answers["Personal Statement"] = _generate_personal_statement(profile, form_type)
        answers["Why I Qualify"] = (
            f"I am a single parent with {profile.get('family_size', 2)} family members, "
            f"studying {profile.get('field_of_study', 'my field')} at {profile.get('education_level', 'the college level')}. "
            f"My income bracket is {profile.get('income_bracket', 'low income')}, and I am committed to improving "
            f"my family's future through education."
        )
    return answers


def _fallback_no_playwright(url: str, profile: dict) -> dict:
    form_type = _detect_form_type(url)
    return {
        "status": "playwright_unavailable",
        "message": "We've pre-filled your answers below. Copy them, then tap \"Open Application Page\" to apply — paste your info right into the form.",
        "url": url,
        "quick_answers": _build_quick_answers(profile, form_type),
    }
