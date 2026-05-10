"""
Therapist listing and search router.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from middleware.auth import get_current_user_id
from lib.supabase_client import get_supabase
from ml.matcher import table_is_empty

router = APIRouter()


@router.get("/list")
def list_therapists(
    specialty: str = Query(None),
    max_price: int = Query(None),
    insurance_only: bool = Query(False),
    limit: int = Query(20, le=50),
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()

    if table_is_empty("therapists"):
        from scrapers import therapist_scraper
        therapist_scraper.run()

    query = sb.table("therapists").select(
        "id,name,title,platform,specialties,price_per_session,accepts_insurance,"
        "telehealth,bio,booking_url,next_available,years_experience,rating"
    )

    if insurance_only:
        query = query.eq("accepts_insurance", True)
    if max_price is not None:
        query = query.lte("price_per_session", max_price)

    result = query.order("rating", desc=True).limit(limit).execute()
    docs = result.data or []

    # Client-side specialty filter (Supabase doesn't support array element ilike natively)
    if specialty:
        sl = specialty.lower()
        docs = [
            d for d in docs
            if any(sl in s.lower() for s in (d.get("specialties") or []))
        ]

    return {"therapists": docs, "total": len(docs)}


@router.get("/search")
def search_therapists(
    q: str = Query(...),
    limit: int = Query(8, le=20),
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()

    if table_is_empty("therapists"):
        from scrapers import therapist_scraper
        therapist_scraper.run()

    # Try pgvector RPC first, fall back to text filter
    try:
        from ml.embeddings import embed_text
        from ml.matcher import _rpc_search
        emb = embed_text(q)
        if emb:
            docs = _rpc_search("match_therapists", emb, limit)
            if docs:
                return {"therapists": docs}
    except Exception:
        pass

    # Fallback: bio/platform text search
    ql = f"%{q}%"
    result = (
        sb.table("therapists")
        .select("id,name,title,platform,specialties,price_per_session,accepts_insurance,telehealth,bio,booking_url,next_available,years_experience,rating")
        .or_(f"bio.ilike.{ql},platform.ilike.{ql},name.ilike.{ql}")
        .limit(limit)
        .execute()
    )
    return {"therapists": result.data or []}


@router.get("/{therapist_id}")
def get_therapist(
    therapist_id: str,
    user_id: str = Depends(get_current_user_id),
):
    sb = get_supabase()
    result = (
        sb.table("therapists")
        .select("id,name,title,platform,specialties,price_per_session,accepts_insurance,telehealth,bio,booking_url,next_available,years_experience,rating")
        .eq("id", therapist_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Therapist not found")
    return result.data
