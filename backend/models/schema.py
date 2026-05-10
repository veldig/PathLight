from pydantic import BaseModel
from typing import Optional


class UserProfile(BaseModel):
    id: Optional[str] = None
    name: str = ""
    state: str = ""
    income_bracket: str = ""
    family_size: int = 1
    child_ages: list[int] = []
    education_level: str = ""
    field_of_study: str = ""
    skills: list[str] = []
    hours_per_week: int = 0
    childcare_needed: bool = False


class ChatMessage(BaseModel):
    message: str


class ConfirmAction(BaseModel):
    confirmed: bool


class AutoApplyPreviewRequest(BaseModel):
    url: str


class AutoApplySubmitRequest(BaseModel):
    url: str
    filled_values: list[dict]
