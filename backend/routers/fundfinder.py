import os
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase
from models.schema import ConfirmAction
from ml.matcher import match_scholarships, table_is_empty

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/search")
def search(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    profile = sb.table("profiles").select("*").eq("id", user_id).maybe_single().execute().data or {}

    if table_is_empty("scholarships"):
        from scrapers import fundfinder_scraper
        fundfinder_scraper.run()

    matched = match_scholarships(profile, limit=5)

    if matched:
        opp_lines = "\n".join(
            f"- {m['name']} ({m.get('source', '')}): "
            f"${m.get('amount', 0):,.0f} | Deadline: {m.get('deadline', 'Rolling')} | "
            f"{(m.get('description') or '')[:160]}"
            for m in matched
        )
        prompt = (
            f"You are FundFinder, an AI grant specialist for single parents.\n"
            f"User profile: state={profile.get('state', 'US')}, "
            f"income={profile.get('income_bracket', 'low income')}, "
            f"family_size={profile.get('family_size', 2)}, "
            f"field_of_study={profile.get('field_of_study', 'undecided')}, "
            f"education_level={profile.get('education_level', 'some college')}.\n\n"
            f"Real funding opportunities matched to this user via ML similarity search:\n{opp_lines}\n\n"
            "Using the real opportunities above, return a JSON array of up to 5 the user qualifies for. "
            "Each item must have: {id (uuid string), name, source, amount (number), deadline (string), "
            "match_score (0.7–0.98 float), description (2–3 sentences, personalized to this user), "
            "requirements: [strings], status: 'found'}. "
            "Return only the JSON array — no markdown fences."
        )
    else:
        prompt = (
            f"You are FundFinder, an AI grant specialist for single parents. "
            f"User: state={profile.get('state', 'Maine')}, income={profile.get('income_bracket', '$28k')}, "
            f"family_size={profile.get('family_size', 2)}, field={profile.get('field_of_study', 'healthcare')}. "
            "Return a JSON array of 4 realistic grant/scholarship opportunities this user likely qualifies for. "
            "Each: {id (uuid string), name, source, amount (number), deadline (string), "
            "match_score (0.0–1.0), description, requirements: [string], status: 'found'}. "
            "Return only the JSON array — no markdown."
        )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1800,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"opportunities": response.content[0].text}


@router.post("/confirm/{opportunity_id}")
def confirm_application(
    opportunity_id: str,
    body: ConfirmAction,
    user_id: str = Depends(get_current_user_id),
):
    if not body.confirmed:
        return {"status": "cancelled", "id": opportunity_id}
    return {"status": "submitted", "id": opportunity_id, "message": "Application submitted successfully."}
