from fastapi import APIRouter
from models.schema import ChatMessage
from agents.orchestrator import chat as axo_chat

router = APIRouter()

# In-memory history per session (replace with Supabase in production)
_history: list[dict] = []


@router.post("/message")
def send_message(body: ChatMessage):
    reply = axo_chat(body.message, _history)
    _history.append({"role": "user", "content": body.message})
    _history.append({"role": "assistant", "content": reply})
    return {"reply": reply}


@router.get("/history")
def get_history():
    return {"history": _history}
