from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user_id
from lib.mongo_client import get_mongo
from models.schema import UserProfile

router = APIRouter()


@router.get("")
def get_profile(user_id: str = Depends(get_current_user_id)):
    db = get_mongo()
    doc = db["profiles"].find_one({"_id": user_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.put("")
def update_profile(
    profile: UserProfile,
    user_id: str = Depends(get_current_user_id),
):
    db = get_mongo()
    payload = profile.model_dump(exclude={"id"})
    db["profiles"].update_one({"_id": user_id}, {"$set": payload}, upsert=True)
    doc = db["profiles"].find_one({"_id": user_id})
    doc["id"] = str(doc.pop("_id"))
    return doc
