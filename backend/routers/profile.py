from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase
from models.schema import UserProfile

router = APIRouter()


@router.get("")
def get_profile(user_id: str = Depends(get_current_user_id)):
    sb = get_supabase()
    result = (
        sb.table("profiles")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return result.data


@router.put("")
def update_profile(
    profile: UserProfile,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    payload = profile.model_dump(exclude={"id"})
    payload["id"] = user_id

    result = (
        sb.table("profiles")
        .upsert(payload, on_conflict="id")
        .select()
        .single()
        .execute()
    )
    return result.data
