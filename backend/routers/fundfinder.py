import os
from fastapi import APIRouter
from anthropic import Anthropic
from models.schema import ConfirmAction

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

# Simulated opportunities store — replace with real Grants.gov API + Supabase
_opportunities: list[dict] = []


@router.post("/search")
def search():
    """Use Claude to identify funding opportunities based on user profile."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                "You are FundFinder, an AI grant specialist for single parents. "
                "Return a JSON array of 3 realistic funding opportunities for a single mother "
                "in Maine studying healthcare, income ~$28k, one child age 4. "
                "Each item: {id, name, source, amount, deadline, match_score (0-1), description, "
                "requirements: [str], status: 'found'}."
            ),
        }],
    )
    return {"opportunities": response.content[0].text}


@router.get("/opportunities")
def get_opportunities():
    return {"opportunities": _opportunities}


@router.post("/confirm/{opportunity_id}")
def confirm_application(opportunity_id: str, body: ConfirmAction):
    """Human-in-the-loop gate: user confirms before the agent submits."""
    if not body.confirmed:
        return {"status": "cancelled", "id": opportunity_id}
    # TODO: trigger Selenium form submission here
    return {"status": "submitted", "id": opportunity_id, "message": "Application submitted successfully."}
