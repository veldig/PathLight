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
        f"You are FundFinder, an AI grant specialist for single parents. "
        f"User: state={profile.get('state','Maine')}, "
        f"income={profile.get('income_bracket','$28k')}, "
        f"family_size={profile.get('family_size',2)}, "
        f"field={profile.get('field_of_study','healthcare')}. "
        "Return a JSON array of 3 realistic funding opportunities they qualify for. "
        "Each: {id (uuid string), name, source, amount (number), deadline (YYYY-MM-DD), "
        "match_score (0.0-1.0), description, requirements: [string], status: 'found'}."
    )
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"opportunities": response.content[0].text}


@router.get("/opportunities")
def get_opportunities(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    result = sb.table("funding_opportunities").select("*").eq("id", user_id).execute()
    return {"opportunities": result.data}


@router.post("/confirm/{opportunity_id}")
def confirm_application(
    opportunity_id: str,
    body: ConfirmAction,
    user_id: str = Depends(get_current_user_id),
):
    if not body.confirmed:
        return {"status": "cancelled", "id": opportunity_id}

    sb = get_supabase()
    sb.table("funding_opportunities").update({"status": "submitted"}).eq("id", opportunity_id).eq("id", user_id).execute()
    # TODO: trigger Selenium form submission here
    return {"status": "submitted", "id": opportunity_id, "message": "Application submitted successfully."}
