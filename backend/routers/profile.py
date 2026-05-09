from fastapi import APIRouter
from models.schema import UserProfile

router = APIRouter()

# Placeholder — replace with Supabase reads/writes
_profile: dict = {}


@router.get("")
def get_profile():
    return _profile


@router.put("")
def update_profile(profile: UserProfile):
    global _profile
    _profile = profile.model_dump()
    return _profile
