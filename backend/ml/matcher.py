"""
Vector similarity search against MongoDB collections using in-memory cosine similarity.
Replaces the previous Supabase pgvector RPC approach.
"""
from __future__ import annotations
import numpy as np
from lib.mongo_client import get_mongo
from ml.embeddings import embed_profile


def _cosine(a: list, b: list) -> float:
    va, vb = np.array(a, dtype=float), np.array(b, dtype=float)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


def table_is_empty(collection: str) -> bool:
    try:
        return get_mongo()[collection].count_documents({}) == 0
    except Exception:
        return True


def _mongo_search(collection: str, embedding: list[float], limit: int) -> list[dict]:
    try:
        db = get_mongo()
        docs = list(db[collection].find({"embedding": {"$exists": True, "$ne": None}}))
        scored = []
        for doc in docs:
            emb = doc.get("embedding")
            if emb:
                out = {k: v for k, v in doc.items() if k not in ("embedding", "_id")}
                out["id"] = str(doc.get("id") or doc["_id"])
                out["similarity"] = _cosine(embedding, emb)
                scored.append(out)
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:limit]
    except Exception:
        return []


def match_scholarships(profile: dict, limit: int = 5) -> list[dict]:
    emb = embed_profile(profile)
    return _mongo_search("scholarships", emb, limit) if emb else []


def match_jobs(profile: dict, limit: int = 5) -> list[dict]:
    emb = embed_profile(profile)
    return _mongo_search("jobs", emb, limit) if emb else []


def match_courses(profile: dict, limit: int = 6) -> list[dict]:
    emb = embed_profile(profile)
    return _mongo_search("courses", emb, limit) if emb else []


def match_wellness_resources(profile: dict, limit: int = 4) -> list[dict]:
    emb = embed_profile(profile)
    return _mongo_search("wellness_resources", emb, limit) if emb else []


def match_therapists(profile: dict, limit: int = 5) -> list[dict]:
    emb = embed_profile(profile)
    return _mongo_search("therapists", emb, limit) if emb else []
