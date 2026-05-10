"""
Therapist listing and search router.
"""
import os
from fastapi import APIRouter, Depends, Query
from middleware.auth import get_current_user_id
from lib.mongo_client import get_mongo
from ml.embeddings import embed_text

router = APIRouter()


@router.get("/list")
def list_therapists(
    specialty: str = Query(None, description="Filter by specialty keyword"),
    max_price: int = Query(None, description="Maximum price per session"),
    insurance_only: bool = Query(False, description="Only show insurance-accepting therapists"),
    limit: int = Query(20, le=50),
    user_id: str = Depends(get_current_user_id),
):
    """Return therapist listings with optional filters."""
    db = get_mongo()

    if db["therapists"].count_documents({}) < 5:
        from scrapers import therapist_scraper
        therapist_scraper.run()

    query: dict = {}
    if insurance_only:
        query["accepts_insurance"] = True
    if max_price is not None:
        query["price_per_session"] = {"$lte": max_price}
    if specialty:
        query["specialties"] = {"$elemMatch": {"$regex": specialty, "$options": "i"}}

    docs = list(
        db["therapists"]
        .find(query, {"embedding": 0})
        .sort("rating", -1)
        .limit(limit)
    )
    for d in docs:
        d["id"] = str(d.pop("_id", d.get("id", "")))
    return {"therapists": docs, "total": len(docs)}


@router.get("/search")
def search_therapists(
    q: str = Query(..., description="Natural language search query"),
    limit: int = Query(8, le=20),
    user_id: str = Depends(get_current_user_id),
):
    """Semantic search for therapists matching a query."""
    import numpy as np

    db = get_mongo()

    if db["therapists"].count_documents({}) < 5:
        from scrapers import therapist_scraper
        therapist_scraper.run()

    query_emb = embed_text(q)
    if not query_emb:
        # Fall back to text search
        docs = list(
            db["therapists"]
            .find(
                {"$or": [
                    {"specialties": {"$elemMatch": {"$regex": q, "$options": "i"}}},
                    {"bio": {"$regex": q, "$options": "i"}},
                    {"name": {"$regex": q, "$options": "i"}},
                ]},
                {"embedding": 0},
            )
            .limit(limit)
        )
        for d in docs:
            d["id"] = str(d.pop("_id", d.get("id", "")))
        return {"therapists": docs}

    # Cosine similarity in Python
    all_docs = list(db["therapists"].find({"embedding": {"$exists": True}}))
    q_vec = np.array(query_emb)

    scored = []
    for doc in all_docs:
        emb = doc.get("embedding")
        if not emb:
            continue
        v = np.array(emb)
        norm = np.linalg.norm(q_vec) * np.linalg.norm(v)
        score = float(np.dot(q_vec, v) / norm) if norm else 0.0
        doc.pop("embedding", None)
        doc["id"] = str(doc.pop("_id", doc.get("id", "")))
        doc["similarity"] = round(score, 4)
        scored.append(doc)

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return {"therapists": scored[:limit]}


@router.get("/{therapist_id}")
def get_therapist(
    therapist_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get a single therapist by id field."""
    db = get_mongo()
    doc = db["therapists"].find_one({"id": therapist_id}, {"embedding": 0})
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Therapist not found")
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    return doc
