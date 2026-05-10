from fastapi import APIRouter, Depends
from models.schema import ChatMessage
from agents.orchestrator import chat as axo_chat
from middleware.auth import get_current_user_id

router = APIRouter()

# Per-user history — replace with Supabase persistence for production
_histories: dict[str, list[dict]] = {}


@router.post("/message")
def send_message(body: ChatMessage, user_id: str = Depends(get_current_user_id)):
    history = _histories.setdefault(user_id, [])
    reply = axo_chat(body.message, history)
    history.append({"role": "user", "content": body.message})
    history.append({"role": "assistant", "content": reply})
    return {"reply": reply}


@router.get("/history")
def get_history(user_id: str = Depends(get_current_user_id)):
    return {"history": _histories.get(user_id, [])}
