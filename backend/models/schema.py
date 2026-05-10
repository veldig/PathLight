from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class UserProfile(BaseModel):
    id: Optional[UUID] = None
    name: str
    state: str
    income_bracket: str
    family_size: int
    child_ages: list[int] = []
    education_level: str
    field_of_study: str
    skills: list[str] = []
    hours_per_week: int
    childcare_needed: bool


class ChatMessage(BaseModel):
    message: str


class ConfirmAction(BaseModel):
    confirmed: bool


class AutoApplyPreviewRequest(BaseModel):
    url: str


class AutoApplySubmitRequest(BaseModel):
    url: str
    filled_values: list[dict]
