import os
from fastapi import APIRouter
from anthropic import Anthropic

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/analyze")
def analyze():
    """Generate a personalized education plan using Claude."""
    # TODO: pull real user profile from Supabase
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                "You are EduPath, an AI education advisor for single parents. "
                "Generate a sample personalized education roadmap for a single mother "
                "studying healthcare administration, 15 hours/week available, some college credits. "
                "Return a JSON object with: degree_target, estimated_months, weekly_schedule (array), "
                "recommended_courses (array of {name, credits, online: bool})."
            ),
        }],
    )
    return {"plan": response.content[0].text}


@router.get("/plan")
def get_plan():
    return {"plan": None, "message": "No plan generated yet. POST /analyze first."}
