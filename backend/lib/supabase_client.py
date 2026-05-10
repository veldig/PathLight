import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ["SUPABASE_KEY"]
        _client = create_client(url, key)
    return _client


def get_user_email(user_id: str) -> str:
    try:
        resp = get_supabase().auth.admin.get_user_by_id(user_id)
        return resp.user.email or ""
    except Exception:
        return ""
