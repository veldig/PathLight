from fastapi import APIRouter

router = APIRouter()

# Seed events matching the UI prototype
SEED_EVENTS = [
    {"id": "1", "agent": "edupath",     "title": "Class: Psychology 101", "datetime": "2026-05-12T10:00:00", "type": "class"},
    {"id": "2", "agent": "careerboost", "title": "Job Application Deadline", "datetime": "2026-05-13T23:59:00", "type": "deadline"},
    {"id": "3", "agent": "fundfinder",  "title": "Grant Confirmation Due", "datetime": "2026-05-14T23:59:00", "type": "deadline"},
    {"id": "4", "agent": "wellness",    "title": "Therapy Session", "datetime": "2026-05-16T14:00:00", "type": "appointment"},
]


@router.get("/events")
def get_events():
    return {"events": SEED_EVENTS}
