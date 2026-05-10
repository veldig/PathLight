"""
Vector similarity search against MongoDB using cosine similarity computed in Python.
"""
from __future__ import annotations
from lib.mongo_client import get_mongo
from ml.embeddings import embed_profile
import numpy as np


def table_is_empty(collection: str) -> bool:
    try:
        db = get_mongo()
        return db[collection].count_documents({}) == 0
    except Exception:
        return True


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    norm_a, norm_b = np.linalg.norm(va), np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))


def _mongo_search(collection: str, embedding: list[float], limit: int) -> list[dict]:
    try:
        db = get_mongo()
        docs = list(db[collection].find({"embedding": {"$exists": True}}))
        scored = [
            (doc, _cosine_similarity(embedding, doc["embedding"]))
            for doc in docs
            if doc.get("embedding")
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        results = []
        for doc, score in scored[:limit]:
            doc.pop("embedding", None)
            doc["id"] = str(doc.pop("_id", ""))
            doc["similarity"] = score
            results.append(doc)
        return results
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
