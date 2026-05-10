import base64
import os

import httpx
from anthropic import Anthropic
from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel

router = APIRouter()
client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel — clear, calm, encouraging

REPHRASE_SYSTEM = (
    "You are an adaptive learning assistant for students with ADHD and dyslexia. "
    "Rewrite the given text so it is easier to process:\n"
    "- Short sentences (≤15 words each)\n"
    "- Simple, everyday words — no jargon unless defined\n"
    "- Active voice and concrete imagery\n"
    "- Preserve all factual accuracy\n"
    "Reply with only the rewritten text, no preamble."
)


class RephraseRequest(BaseModel):
    text: str
    focus_level: str = "medium"


class HintRequest(BaseModel):
    topic: str
    focus_level: str
    mode: str  # read | watch | quiz


class SpeakRequest(BaseModel):
    text: str


@router.post("/rephrase")
def rephrase_content(body: RephraseRequest):
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        system=REPHRASE_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Focus level: {body.focus_level}. "
                    f"Rephrase this academic text:\n\n{body.text}"
                ),
            }
        ],
    )
    return {"rephrased": msg.content[0].text}


@router.post("/hint")
def get_hint(body: HintRequest):
    prompt = (
        f"A student studying '{body.topic}' is in {body.mode} mode "
        f"with {body.focus_level} focus. "
        "Give them one encouraging, specific hint or tip (2 sentences max). "
        "Be warm, brief, and actionable. Reply with only the hint."
    )
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=100,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"hint": msg.content[0].text}


@router.post("/speak")
async def speak(body: SpeakRequest):
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        return Response(status_code=503, content="ElevenLabs not configured")

    async with httpx.AsyncClient(timeout=20.0) as http:
        resp = await http.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={
                "text": body.text,
                "model_id": "eleven_turbo_v2",
                "voice_settings": {"stability": 0.55, "similarity_boost": 0.8},
            },
        )

    if resp.status_code != 200:
        return Response(status_code=502, content=f"ElevenLabs {resp.status_code}")

    audio_b64 = base64.b64encode(resp.content).decode()
    return {"audio_b64": audio_b64}
