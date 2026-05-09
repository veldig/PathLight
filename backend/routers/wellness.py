import os
from datetime import date
from fastapi import APIRouter, Depends
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/checkin")
def start_checkin(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()

    # Get or init streak
    streak_result = sb.table("wellness_streaks").select("*").eq("user_id", user_id).maybe_single().execute()
    streak_data = streak_result.data or {}
    last_checkin = streak_data.get("last_checkin")
    current_streak = streak_data.get("current_streak", 0)

    today = date.today().isoformat()
    if last_checkin == today:
        new_streak = current_streak
    elif last_checkin and (date.today() - date.fromisoformat(last_checkin)).days == 1:
        new_streak = current_streak + 1
    else:
        new_streak = 1

    sb.table("wellness_streaks").upsert(
        {"user_id": user_id, "current_streak": new_streak, "last_checkin": today},
        on_conflict="user_id",
    ).execute()

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                "You are WellnessGuide, a compassionate mental health support AI for single parents. "
                "Start a brief daily check-in. Ask one warm, open-ended question about how the user "
                "is feeling today. Keep it to 2-3 sentences. Be empathetic and non-clinical."
            ),
        }],
    )
    return {"message": response.content[0].text, "streak": new_streak}


@router.get("/history")
def get_history(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    checkins = sb.table("wellness_checkins").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(30).execute()
    streak = sb.table("wellness_streaks").select("*").eq("user_id", user_id).maybe_single().execute()
    return {
        "checkins": checkins.data,
        "current_streak": (streak.data or {}).get("current_streak", 0),
    }
