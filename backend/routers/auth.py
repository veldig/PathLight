import os
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import bcrypt
import jwt
import httpx
from lib.mongo_client import get_mongo

router = APIRouter()

JWT_SECRET = os.environ.get("JWT_SECRET", "changeme-set-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str


class GoogleAuthRequest(BaseModel):
    access_token: str


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/register")
def register(body: RegisterRequest):
    db = get_mongo()
    if db["users"].find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    db["users"].insert_one({
        "_id": user_id,
        "email": body.email,
        "password": hashed,
        "name": body.name,
        "created_at": datetime.utcnow().isoformat(),
    })

    db["profiles"].update_one(
        {"_id": user_id},
        {"$setOnInsert": {
            "_id": user_id,
            "name": body.name,
            "state": "",
            "income_bracket": "",
            "family_size": 1,
            "child_ages": [],
            "education_level": "",
            "field_of_study": "",
            "skills": [],
            "hours_per_week": 0,
            "childcare_needed": False,
        }},
        upsert=True,
    )

    token = create_token(user_id)
    return {"token": token, "user_id": user_id, "email": body.email}


@router.post("/login")
def login(body: LoginRequest):
    db = get_mongo()
    user = db["users"].find_one({"email": body.email})
    if not user or not bcrypt.checkpw(body.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(str(user["_id"]))
    return {"token": token, "user_id": str(user["_id"]), "email": user["email"]}


@router.post("/google")
def google_auth(body: GoogleAuthRequest):
    # Verify token with Google and get user profile
    with httpx.Client() as client:
        r = client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {body.access_token}"},
            timeout=10,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    profile = r.json()
    email = profile.get("email")
    name = profile.get("name", email.split("@")[0] if email else "User")
    google_id = profile.get("id")

    if not email:
        raise HTTPException(status_code=400, detail="No email returned from Google")

    db = get_mongo()
    user = db["users"].find_one({"email": email})

    if not user:
        # New user — create account automatically
        user_id = str(uuid.uuid4())
        db["users"].insert_one({
            "_id": user_id,
            "email": email,
            "name": name,
            "google_id": google_id,
            "password": None,
            "created_at": datetime.utcnow().isoformat(),
        })
        db["profiles"].update_one(
            {"_id": user_id},
            {"$setOnInsert": {
                "_id": user_id,
                "name": name,
                "state": "",
                "income_bracket": "",
                "family_size": 1,
                "child_ages": [],
                "education_level": "",
                "field_of_study": "",
                "skills": [],
                "hours_per_week": 0,
                "childcare_needed": False,
            }},
            upsert=True,
        )
    else:
        user_id = str(user["_id"])
        # Update google_id if signing in with Google for first time
        if not user.get("google_id"):
            db["users"].update_one({"_id": user_id}, {"$set": {"google_id": google_id}})

    token = create_token(user_id)
    return {"token": token, "user_id": user_id, "email": email, "name": name}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest):
    db = get_mongo()
    user = db["users"].find_one({"email": body.email})
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    hashed = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    db["users"].update_one({"email": body.email}, {"$set": {"password": hashed}})
    return {"message": "Password updated successfully"}
