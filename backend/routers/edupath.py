import os
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.mongo_client import get_mongo
from ml.matcher import match_courses, table_is_empty

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/analyze")
def analyze(user_id: str = Depends(get_current_user_id)):
    db = get_mongo()
    profile = db["profiles"].find_one({"_id": user_id}) or {}
    if profile:
        profile["id"] = profile.pop("_id", user_id)

    if table_is_empty("courses"):
        from scrapers import edupath_scraper
        edupath_scraper.run()

    matched = match_courses(profile, limit=6)

    if matched:
        course_lines = "\n".join(
            f"- {c['name']} ({c.get('provider', '')}) | {c.get('credits', 3)} credits | "
            f"Online: {c.get('online', True)} | Field: {c.get('field', '')} | "
            f"{(c.get('description') or '')[:120]}"
            for c in matched
        )
        prompt = (
            f"You are EduPath, an AI education advisor for single parents.\n"
            f"User profile: field_of_study={profile.get('field_of_study', 'undecided')}, "
            f"education_level={profile.get('education_level', 'some college')}, "
            f"hours_per_week={profile.get('hours_per_week', 15)}, "
            f"childcare_needed={profile.get('childcare_needed', False)}, "
            f"income={profile.get('income_bracket', 'low income')}.\n\n"
            f"Real courses matched to this user via ML similarity search:\n{course_lines}\n\n"
            "Create a personalized education roadmap using the real courses above where relevant. "
            "Return a JSON object with: "
            "degree_target (string), estimated_months (number), "
            "weekly_schedule (array of strings describing realistic time blocks around childcare), "
            "recommended_courses (array of {name, credits (number), online (bool), provider, "
            "description (1 sentence why it fits this user)}). "
            "Return only the JSON object — no markdown fences."
        )
    else:
        prompt = (
            f"You are EduPath, an AI education advisor for single parents. "
            f"User: field={profile.get('field_of_study', 'healthcare')}, "
            f"hours_per_week={profile.get('hours_per_week', 15)}, "
            f"education_level={profile.get('education_level', 'some college')}. "
            "Generate a personalized education roadmap. Return a JSON object with: "
            "degree_target, estimated_months, weekly_schedule (array of strings), "
            "recommended_courses (array of {name, credits, online: bool, provider, description}). "
            "Return only the JSON object — no markdown."
        )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1800,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"plan": response.content[0].text}


@router.get("/plan")
def get_plan(user_id: str = Depends(get_current_user_id)):
    db = get_mongo()
    result = db["education_plans"].find_one({"_id": user_id})
    if result:
        result["id"] = result.pop("_id")
    return {"plan": result}
