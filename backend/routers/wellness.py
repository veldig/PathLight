import os
from fastapi import APIRouter
from anthropic import Anthropic

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/checkin")
def start_checkin():
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                "You are WellnessGuide, a compassionate mental health support AI for single parents. "
                "Start a brief daily check-in. Ask one warm, open-ended question about how the user "
                "is feeling today. Keep it to 2-3 sentences max. Be empathetic and non-clinical."
            ),
        }],
    )
    return {"message": response.content[0].text, "streak": 12}


@router.get("/history")
def get_history():
    return {"checkins": [], "current_streak": 12}
