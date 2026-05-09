import os
from fastapi import APIRouter
from anthropic import Anthropic
from models.schema import ConfirmAction

router = APIRouter()
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


@router.post("/search")
def search():
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                "You are CareerBoost, an AI career agent for single parents. "
                "Return a JSON array of 3 flexible job listings suitable for a single mother "
                "studying healthcare, available 20 hrs/week, prefers remote. "
                "Each: {id, title, company, remote (bool), childcare_benefits (bool), "
                "salary_range, match_score (0-1), description, status: 'found'}."
            ),
        }],
    )
    return {"jobs": response.content[0].text}


@router.get("/jobs")
def get_jobs():
    return {"jobs": []}


@router.post("/confirm/{job_id}")
def confirm_application(job_id: str, body: ConfirmAction):
    if not body.confirmed:
        return {"status": "cancelled", "id": job_id}
    # TODO: trigger actual job application via Selenium
    return {"status": "applied", "id": job_id, "message": "Application submitted successfully."}
