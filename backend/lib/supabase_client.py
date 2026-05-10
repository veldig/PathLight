"""
Thin compatibility shim — now backed by MongoDB instead of Supabase.
Only get_user_email() is kept; all direct DB access uses lib.mongo_client.
"""
from lib.mongo_client import get_mongo


def get_user_email(user_id: str) -> str:
    try:
        db = get_mongo()
        user = db["users"].find_one({"_id": user_id}, {"email": 1})
        return user["email"] if user else ""
    except Exception:
        return ""
