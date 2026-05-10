from dotenv import load_dotenv
load_dotenv()

import os
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from routers import profile, fundfinder, careerboost, wellness, chat, calendar, therapists, focuspath

app = FastAPI(title="PathLight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    """Seed all ML tables with scraped + curated data. Requires X-Admin-Key header."""
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
