from fastapi import APIRouter, Depends
from models.schema import ChatMessage
from agents.orchestrator import chat as axo_chat
from middleware.auth import get_current_user_id
from lib.mongo_client import get_mongo
from datetime import datetime

router = APIRouter()


@router.post("/message")
def send_message(body: ChatMessage, user_id: str = Depends(get_current_user_id)):
    db = get_mongo()
    history_docs = list(db["chat_history"].find({"user_id": user_id}).sort("ts", 1).limit(20))
    history = [{"role": d["role"], "content": d["content"]} for d in history_docs]

    reply = axo_chat(body.message, history)

    now = datetime.utcnow().isoformat()
    db["chat_history"].insert_many([
        {"user_id": user_id, "role": "user", "content": body.message, "ts": now},
        {"user_id": user_id, "role": "assistant", "content": reply, "ts": now},
    ])
    return {"reply": reply}


@router.get("/history")
def get_history(user_id: str = Depends(get_current_user_id)):
    db = get_mongo()
    history_docs = list(db["chat_history"].find({"user_id": user_id}).sort("ts", 1))
    return {"history": [{"role": d["role"], "content": d["content"]} for d in history_docs]}
