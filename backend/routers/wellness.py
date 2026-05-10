import base64
import os
from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel
import httpx
from anthropic import Anthropic
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase
from ml.matcher import match_wellness_resources, table_is_empty

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

THERAPY_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # Bella — soft, warm, calming

ARIA_SYSTEM = """You are Aria, a compassionate AI wellness companion on PathLight — a platform built for student parents balancing school, work, and caregiving.

Your role:
- Provide emotional support and help users process their feelings
- Use reflective listening: "It sounds like you're feeling..."
- Ask one gentle open-ended question at a time
- Keep responses warm and concise (3–4 sentences max)
- Acknowledge the unique stress of being a student parent
- Suggest professional help gently when concerns are serious
- Never diagnose or prescribe medication

IMPORTANT: If someone expresses suicidal thoughts or immediate danger, respond with care and immediately provide: "Please call or text 988 (Suicide & Crisis Lifeline) — they are available 24/7."

You are NOT a replacement for professional therapy. You are a supportive companion."""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class SpeakRequest(BaseModel):
    text: str


@router.post("/checkin")
def start_checkin(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()

    streak_data = sb.table("wellness_streaks").select("*").eq("user_id", user_id).maybe_single().execute().data or {}
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

    if table_is_empty("wellness_resources"):
        from scrapers import wellness_scraper
        wellness_scraper.run()

    profile = sb.table("profiles").select("*").eq("id", user_id).maybe_single().execute().data or {}
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


@router.post("/chat")
def chat(body: ChatRequest, user_id: str = Depends(get_current_user_id)):
    messages = [{"role": m.role, "content": m.content} for m in body.history[-12:]]
    messages.append({"role": "user", "content": body.message})
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=ARIA_SYSTEM,
        messages=messages,
    )
    return {"reply": response.content[0].text}


@router.post("/speak")
async def speak(body: SpeakRequest, user_id: str = Depends(get_current_user_id)):
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        return {"audio_b64": None, "error": "ElevenLabs not configured"}
    async with httpx.AsyncClient(timeout=20.0) as http:
        resp = await http.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{THERAPY_VOICE_ID}",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={
                "text": body.text,
                "model_id": "eleven_turbo_v2",
                "voice_settings": {"stability": 0.72, "similarity_boost": 0.75},
            },
        )
    if resp.status_code != 200:
        return {"audio_b64": None, "error": f"ElevenLabs error {resp.status_code}"}
    return {"audio_b64": base64.b64encode(resp.content).decode(), "error": None}


@router.get("/history")
def get_history(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    checkins = sb.table("wellness_checkins").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(30).execute()
    streak = sb.table("wellness_streaks").select("*").eq("user_id", user_id).maybe_single().execute()
    return {
        "checkins": checkins.data,
        "current_streak": (streak.data or {}).get("current_streak", 0),
    }
