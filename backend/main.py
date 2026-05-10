from dotenv import load_dotenv
load_dotenv()

import os
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import Response

from routers import auth, profile, fundfinder, careerboost, wellness, chat, calendar, therapists, focuspath

app = FastAPI(title="PathLight API", version="1.0.0")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
}


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return Response(status_code=200, headers=CORS_HEADERS)
    response = await call_next(request)
    for k, v in CORS_HEADERS.items():
        response.headers[k] = v
    return response


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(fundfinder.router, prefix="/agents/fundfinder", tags=["fundfinder"])
app.include_router(careerboost.router, prefix="/agents/careerboost", tags=["careerboost"])
app.include_router(wellness.router, prefix="/agents/wellness", tags=["wellness"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
app.include_router(therapists.router, prefix="/agents/wellness/therapists", tags=["therapists"])
app.include_router(focuspath.router, prefix="/agents/focuspath", tags=["focuspath"])


@app.get("/")
def root():
    return {
        "name": "PathLight API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/admin/scrape")
def admin_scrape(x_admin_key: str = Header(None)):
    expected = os.environ.get("ADMIN_KEY", "")
    if not expected or x_admin_key != expected:
        raise HTTPException(status_code=403, detail="Forbidden")

    from scrapers import fundfinder_scraper, careerboost_scraper, wellness_scraper, therapist_scraper
    return {
        "status": "ok",
        "seeded": {
            "scholarships": fundfinder_scraper.run(force=True),
            "jobs": careerboost_scraper.run(force=True),
            "wellness_resources": wellness_scraper.run(force=True),
            "therapists": therapist_scraper.run(force=True),
        },
    }
