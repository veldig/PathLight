import os
from datetime import date
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.mongo_client import get_mongo
from ml.matcher import match_wellness_resources, table_is_empty

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/checkin")
def start_checkin(user_id: str = Depends(get_current_user_id)):
    db = get_mongo()

    streak_doc = db["wellness_streaks"].find_one({"_id": user_id}) or {}
    last_checkin = streak_doc.get("last_checkin")
    current_streak = streak_doc.get("current_streak", 0)

    today = date.today().isoformat()
    if last_checkin == today:
        new_streak = current_streak
    elif last_checkin and (date.today() - date.fromisoformat(last_checkin)).days == 1:
        new_streak = current_streak + 1
    else:
        new_streak = 1

    db["wellness_streaks"].update_one(
        {"_id": user_id},
        {"$set": {"current_streak": new_streak, "last_checkin": today}},
        upsert=True,
    )

    if table_is_empty("wellness_resources"):
        from scrapers import wellness_scraper
        wellness_scraper.run()

    profile = db["profiles"].find_one({"_id": user_id}) or {}
    if profile:
        profile["id"] = profile.pop("_id", user_id)
    matched_resources = match_wellness_resources(profile, limit=3)

    resource_context = ""
    if matched_resources:
        resource_lines = "\n".join(
            f"- {r['name']} ({r.get('type', '')}): {r.get('contact', '')} — {(r.get('description') or '')[:120]}"
            for r in matched_resources
        )
        resource_context = f"\n\nReal support resources matched for this user:\n{resource_lines}"

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": (
                "You are WellnessGuide, a compassionate mental health support AI for single parents. "
                f"The user has a {new_streak}-day check-in streak. "
                f"Their profile: state={profile.get('state', 'US')}, "
                f"family_size={profile.get('family_size', 2)}, "
                f"field={profile.get('field_of_study', 'education')}."
                f"{resource_context}\n\n"
                "Write a brief, warm daily check-in message (2–3 sentences). "
                "Ask one open-ended question about how they're doing today. "
                "Be empathetic, grounding, and non-clinical. "
                f"{'Acknowledge their streak with genuine encouragement.' if new_streak > 1 else ''}"
            ),
        }],
    )
    return {"message": response.content[0].text, "streak": new_streak, "resources": matched_resources}


@router.get("/history")
def get_history(user_id: str = Depends(get_current_user_id)):
    db = get_mongo()
    checkins = list(db["wellness_checkins"].find({"user_id": user_id}).sort("created_at", -1).limit(30))
    for c in checkins:
        c["id"] = str(c.pop("_id"))
    streak_doc = db["wellness_streaks"].find_one({"_id": user_id}) or {}
    return {"checkins": checkins, "current_streak": streak_doc.get("current_streak", 0)}
