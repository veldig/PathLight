import os
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase
from models.schema import ConfirmAction, AutoApplyPreviewRequest, AutoApplySubmitRequest
from ml.matcher import match_jobs, table_is_empty

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/search")
def search(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    profile = sb.table("profiles").select("*").eq("id", user_id).maybe_single().execute().data or {}

    if table_is_empty("jobs"):
        from scrapers import careerboost_scraper
        careerboost_scraper.run()

    matched = match_jobs(profile, limit=5)

    if matched:
        job_lines = "\n".join(
            f"- {m['title']} at {m.get('company', '')} | {m.get('salary_range', '')} | "
            f"Remote: {m.get('remote', True)} | Childcare benefits: {m.get('childcare_benefits', False)} | "
            f"{(m.get('description') or '')[:160]}"
            for m in matched
        )
        prompt = (
            f"You are CareerBoost, an AI career agent for single parents.\n"
            f"User profile: skills={profile.get('skills', [])}, "
            f"hours_per_week={profile.get('hours_per_week', 20)}, "
            f"field={profile.get('field_of_study', 'undecided')}, "
            f"childcare_needed={profile.get('childcare_needed', False)}.\n\n"
            f"Real job listings matched to this user via ML similarity search:\n{job_lines}\n\n"
            "Using the real jobs above, return a JSON array of up to 5 listings suited to this user. "
            "Each item: {id (uuid string), title, company, remote (bool), childcare_benefits (bool), "
            "salary_range (string), match_score (0.7–0.98 float), "
            "description (2–3 sentences personalized to this user's situation), status: 'found'}. "
            "Return only the JSON array — no markdown fences."
        )
    else:
        prompt = (
            f"You are CareerBoost, an AI career agent for single parents. "
            f"User: skills={profile.get('skills', [])}, "
            f"hours_per_week={profile.get('hours_per_week', 20)}, "
            f"field={profile.get('field_of_study', 'healthcare')}, prefers remote. "
            "Return a JSON array of 4 flexible job listings suitable for a single parent. "
            "Each: {id (uuid string), title, company, remote (bool), childcare_benefits (bool), "
            "salary_range, match_score (0.0–1.0), description, status: 'found'}. "
            "Return only the JSON array — no markdown."
        )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1800,
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
    sb = get_supabase()
    profile = sb.table("profiles").select("*").eq("id", user_id).maybe_single().execute().data or {}
    from agents.form_agent import preview
    return await preview(body.url, profile)


@router.post("/auto-apply/submit")
async def auto_apply_submit(
    body: AutoApplySubmitRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Re-fill and submit the job application with user-confirmed field values."""
    sb = get_supabase()
    profile = sb.table("profiles").select("*").eq("id", user_id).maybe_single().execute().data or {}
    from agents.form_agent import confirm_and_submit
    return await confirm_and_submit(body.url, profile, body.filled_values)
