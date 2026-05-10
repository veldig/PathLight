import os
import json
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase
from ml.matcher import match_scholarships, table_is_empty

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


def build_prompt(profile: dict, real_scholarships: list[dict]) -> str:
    real_data_section = ""
    if real_scholarships:
        lines = "\n".join(
            f"  - {s['name']} ({s.get('source', '')}): "
            f"${s.get('amount', 0):,.0f} | Deadline: {s.get('deadline', 'Rolling')} | "
            f"{(s.get('description') or '')[:150]}"
            for s in real_scholarships
        )
        real_data_section = f"\nReal scholarships/grants matched to this user via ML vector search:\n{lines}\n\nUse these real opportunities in the scholarships and grants sections where applicable.\n"

    return f"""You are FundFinder, a compassionate AI financial specialist for student parents on Pathlight.

Student Profile:
- Name: {profile.get('name', 'Student')}
- State: {profile.get('state', 'United States')}
- Income Bracket: {profile.get('income_bracket', 'unknown')}
- Family Size: {profile.get('family_size', 2)}
- Field of Study: {profile.get('field_of_study', 'unknown')}
- Education Level: {profile.get('education_level', 'undergraduate')}
- Hours Available Per Week: {profile.get('hours_per_week', 20)}
- Childcare Needed: {profile.get('childcare_needed', True)}
- Skills: {', '.join(profile.get('skills') or [])}
{real_data_section}
Return ONLY a valid JSON object with no markdown, no code blocks, no extra text:

{{
  "summary": "compassionate 2-sentence summary of their situation",
  "urgency": "HIGH",
  "urgency_reason": "why this urgency level",
  "scholarships": [
    {{
      "name": "scholarship name",
      "amount": "$X,XXX",
      "deadline": "Month Year",
      "why_they_qualify": "specific reason based on their profile",
      "how_to_apply": "brief steps",
      "link": "website"
    }}
  ],
  "grants": [
    {{
      "name": "grant name",
      "amount": "$X,XXX",
      "eligibility": "who qualifies",
      "why_they_qualify": "specific reason",
      "link": "website"
    }}
  ],
  "jobs": [
    {{
      "title": "job title",
      "hours": "X hours/week",
      "pay": "$XX/hour",
      "why_it_fits": "how it fits their schedule",
      "where_to_find": "where to apply"
    }}
  ],
  "childcare_assistance": [
    {{
      "program": "program name",
      "benefit": "what it provides",
      "eligibility": "who qualifies",
      "how_to_apply": "steps"
    }}
  ],
  "emergency_aid": [
    {{
      "source": "source name",
      "amount": "amount",
      "when_to_use": "situation"
    }}
  ],
  "immediate_next_steps": [
    "step 1 - most urgent",
    "step 2",
    "step 3",
    "step 4",
    "step 5"
  ],
  "monthly_budget_breakdown": {{
    "income_potential": "$X,XXX",
    "aid_potential": "$X,XXX",
    "gap": "$XXX surplus or deficit",
    "note": "how to close the gap"
  }}
}}"""


@router.post("/search")
def search(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    profile = sb.table("profiles").select("*").eq("id", user_id).maybe_single().execute().data or {}

    if table_is_empty("scholarships"):
        from scrapers import fundfinder_scraper
        fundfinder_scraper.run()

    real_scholarships = match_scholarships(profile, limit=6)

    prompt = build_prompt(profile, real_scholarships)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"error": "Failed to parse response", "raw": raw}

    return {"financial_plan": data}
