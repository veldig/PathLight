"""
Vector similarity search against Supabase pgvector tables via RPC functions.
"""
from __future__ import annotations
from lib.supabase_client import get_supabase
from ml.embeddings import embed_profile


def table_is_empty(table: str) -> bool:
    try:
        result = get_supabase().table(table).select("id", count="exact").limit(1).execute()
        return (result.count or 0) == 0
    except Exception:
        return True


def _rpc_search(rpc_fn: str, embedding: list[float], limit: int) -> list[dict]:
    try:
        result = get_supabase().rpc(rpc_fn, {
            "query_embedding": embedding,
            "match_count": limit,
        }).execute()
        return result.data or []
    except Exception:
        return []


def match_scholarships(profile: dict, limit: int = 5) -> list[dict]:
    emb = embed_profile(profile)
    return _rpc_search("match_scholarships", emb, limit) if emb else []


def match_jobs(profile: dict, limit: int = 5) -> list[dict]:
    emb = embed_profile(profile)
    return _rpc_search("match_jobs", emb, limit) if emb else []


def match_courses(profile: dict, limit: int = 6) -> list[dict]:
    emb = embed_profile(profile)
    return _rpc_search("match_courses", emb, limit) if emb else []


def match_wellness_resources(profile: dict, limit: int = 4) -> list[dict]:
    emb = embed_profile(profile)
    return _rpc_search("match_wellness_resources", emb, limit) if emb else []
