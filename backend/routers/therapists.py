from fastapi import APIRouter, Depends, Query, HTTPException
from middleware.auth import get_current_user_id
from lib.mongo_client import get_mongo
from ml.matcher import table_is_empty, match_therapists

router = APIRouter()


@router.get("/list")
def list_therapists(
    specialty: str = Query(None),
    max_price: int = Query(None),
    insurance_only: bool = Query(False),
    limit: int = Query(20, le=50),
    user_id: str = Depends(get_current_user_id),
):
    if table_is_empty("therapists"):
        from scrapers import therapist_scraper
        therapist_scraper.run()

    db = get_mongo()
    query: dict = {}
    if insurance_only:
        query["accepts_insurance"] = True
    if max_price is not None:
        query["price_per_session"] = {"$lte": max_price}

    docs = list(
        db["therapists"]
        .find(query, {"embedding": 0})
        .sort("rating", -1)
        .limit(limit)
    )

    if specialty:
        sl = specialty.lower()
        docs = [d for d in docs if any(sl in s.lower() for s in (d.get("specialties") or []))]

    for d in docs:
        d["id"] = str(d.pop("_id"))
    return {"therapists": docs, "total": len(docs)}


@router.get("/search")
def search_therapists(
    q: str = Query(...),
    limit: int = Query(8, le=20),
    user_id: str = Depends(get_current_user_id),
):
    if table_is_empty("therapists"):
        from scrapers import therapist_scraper
        therapist_scraper.run()

    # Try vector search first
    try:
        from ml.embeddings import embed_text
        emb = embed_text(q)
        if emb:
            docs = match_therapists({"field_of_study": q}, limit=limit)
            if docs:
                return {"therapists": docs}
    except Exception:
        pass

    # Fallback: regex text search
    db = get_mongo()
    regex = {"$regex": q, "$options": "i"}
    docs = list(
        db["therapists"]
        .find(
            {"$or": [{"bio": regex}, {"platform": regex}, {"name": regex}]},
            {"embedding": 0},
        )
        .limit(limit)
    )
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return {"therapists": docs}


@router.get("/{therapist_id}")
def get_therapist(
    therapist_id: str,
    user_id: str = Depends(get_current_user_id),
):
    db = get_mongo()
    doc = db["therapists"].find_one({"_id": therapist_id}, {"embedding": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Therapist not found")
    doc["id"] = str(doc.pop("_id"))
    return doc
