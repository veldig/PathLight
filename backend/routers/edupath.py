import os
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/analyze")
def analyze(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    profile_result = sb.table("users_profile").select("*").eq("user_id", user_id).maybe_single().execute()
    profile = profile_result.data or {}

    prompt = (
        f"You are EduPath, an AI education advisor for single parents. "
        f"User profile: field={profile.get('field_of_study','healthcare')}, "
        f"hours_per_week={profile.get('hours_per_week',15)}, "
        f"education_level={profile.get('education_level','some college')}. "
        "Generate a personalized education roadmap. Return a JSON object with: "
        "degree_target, estimated_months, weekly_schedule (array of strings), "
        "recommended_courses (array of {name, credits, online: bool})."
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"plan": response.content[0].text}


@router.get("/plan")
def get_plan(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    result = sb.table("education_plans").select("*").eq("user_id", user_id).maybe_single().execute()
    return {"plan": result.data}
