import os
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase
from models.schema import ConfirmAction

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/search")
def search(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    profile_result = sb.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    profile = profile_result.data or {}

    prompt = (
        f"You are CareerBoost, an AI career agent for single parents. "
        f"User: skills={profile.get('skills',[])}, "
        f"hours_per_week={profile.get('hours_per_week',20)}, "
        f"field={profile.get('field_of_study','healthcare')}, prefers remote. "
        "Return a JSON array of 3 flexible job listings suitable for them. "
        "Each: {id (uuid string), title, company, remote (bool), childcare_benefits (bool), "
        "salary_range, match_score (0.0-1.0), description, status: 'found'}."
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"jobs": response.content[0].text}


@router.get("/jobs")
def get_jobs(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    result = sb.table("job_listings").select("*").eq("id", user_id).execute()
    return {"jobs": result.data}


@router.post("/confirm/{job_id}")
def confirm_application(
    job_id: str,
    body: ConfirmAction,
    user_id: str = Depends(get_current_user_id),
):
    if not body.confirmed:
        return {"status": "cancelled", "id": job_id}

    sb = get_supabase()
    sb.table("job_listings").update({"status": "applied"}).eq("id", job_id).eq("id", user_id).execute()
    # TODO: trigger Selenium form submission here
    return {"status": "applied", "id": job_id, "message": "Application submitted successfully."}
