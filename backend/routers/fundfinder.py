import os
import json
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

def build_prompt(profile: dict) -> str:
    return f"""You are FundFinder, a compassionate AI financial specialist for student parents on Pathlight.

Student Profile:
- Name: {profile.get('name', 'Student')}
- State: {profile.get('state', 'California')}
- Income Bracket: {profile.get('income_bracket', 'unknown')}
- Family Size: {profile.get('family_size', 2)}
- Field of Study: {profile.get('field_of_study', 'unknown')}
- Education Level: {profile.get('education_level', 'undergraduate')}
- Hours Available Per Week: {profile.get('hours_per_week', 20)}
- Childcare Needed: {profile.get('childcare_needed', True)}
- Skills: {', '.join(profile.get('skills', []))}

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

    prompt = build_prompt(profile)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()

    # Strip markdown code blocks if present
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


@router.get("/opportunities")
def get_opportunities(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    result = sb.table("funding_opportunities").select("*").eq("user_id", user_id).execute()
    return {"opportunities": result.data}