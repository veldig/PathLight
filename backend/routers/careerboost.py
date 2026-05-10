import os
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.mongo_client import get_mongo
from lib.supabase_client import get_user_email
from models.schema import ConfirmAction, AutoApplyPreviewRequest, AutoApplySubmitRequest
from ml.matcher import match_jobs, table_is_empty

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/search")
def search(user_id: str = Depends(get_current_user_id)):
    db = get_mongo()
    profile = db["profiles"].find_one({"_id": user_id}) or {}

    # Seed collection in background so the request doesn't block
    if table_is_empty("jobs"):
        from scrapers import careerboost_scraper
        threading.Thread(target=careerboost_scraper.run, daemon=True).start()

    # ML matching with timeout — fastembed can be slow on cold start
    matched = []
    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(match_jobs, profile, 5)
            matched = future.result(timeout=8)
    except Exception:
        pass

    if matched:
        job_lines = "\n".join(
            f"- ID:{m.get('id','')} | {m['title']} at {m.get('company', '')} | {m.get('salary_range', '')} | "
            f"Remote:{m.get('remote', True)} | Childcare:{m.get('childcare_benefits', False)} | "
            f"URL:{m.get('url','')} | {(m.get('description') or '')[:160]}"
            for m in matched
        )
        prompt = (
            f"You are CareerBoost, an AI career agent for single parents.\n"
            f"User profile: name={profile.get('name','')}, skills={profile.get('skills', [])}, "
            f"hours_per_week={profile.get('hours_per_week', 20)}, "
            f"field={profile.get('field_of_study', 'undecided')}, "
            f"childcare_needed={profile.get('childcare_needed', False)}, "
            f"state={profile.get('state', '')}.\n\n"
            f"Real job listings matched via ML vector search:\n{job_lines}\n\n"
            "Return a JSON array of up to 5 jobs personalized to this user. "
            "Each item MUST include: id (use the ID from above), title, company, remote (bool), "
            "childcare_benefits (bool), salary_range (string), match_score (0.70–0.98 float), "
            "description (2–3 sentences explaining why this job fits this specific user's situation), "
            "url (use the URL from above, or '' if none), status: 'found'. "
            "Return ONLY the JSON array — no markdown fences, no extra text."
        )
    else:
        prompt = (
            f"You are CareerBoost, an AI career agent for single parents. "
            f"User: name={profile.get('name','')}, skills={profile.get('skills', [])}, "
            f"hours_per_week={profile.get('hours_per_week', 20)}, "
            f"field={profile.get('field_of_study', 'healthcare')}, state={profile.get('state','')}, prefers remote. "
            "Return a JSON array of 5 flexible remote job listings for a single parent. "
            "Each: {id (uuid string), title, company, remote (bool), childcare_benefits (bool), "
            "salary_range, match_score (0.70–0.95), description (2-3 sentences), "
            "url (real job board URL for this type of role), status: 'found'}. "
            "Return ONLY the JSON array — no markdown."
        )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"jobs": response.content[0].text}


@router.post("/confirm/{job_id}")
def confirm_application(
    job_id: str,
    body: ConfirmAction,
    user_id: str = Depends(get_current_user_id),
):
    if not body.confirmed:
        return {"status": "cancelled", "id": job_id}
    return {"status": "applied", "id": job_id, "message": "Application submitted successfully."}


@router.post("/auto-apply/preview")
async def auto_apply_preview(
    body: AutoApplyPreviewRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Fill a job application form using the user's profile. Returns preview for review."""
    db = get_mongo()
    profile = db["profiles"].find_one({"_id": user_id}) or {}
    profile["email"] = get_user_email(user_id)
    from agents.form_agent import preview
    return await preview(body.url, profile)


@router.post("/auto-apply/submit")
async def auto_apply_submit(
    body: AutoApplySubmitRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Re-fill and submit the job application with user-confirmed field values."""
    db = get_mongo()
    profile = db["profiles"].find_one({"_id": user_id}) or {}
    profile["email"] = get_user_email(user_id)
    from agents.form_agent import confirm_and_submit
    return await confirm_and_submit(body.url, profile, body.filled_values)
