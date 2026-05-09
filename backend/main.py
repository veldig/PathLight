from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import profile, edupath, fundfinder, careerboost, wellness, chat, calendar

app = FastAPI(title="PathLight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(edupath.router, prefix="/agents/edupath", tags=["edupath"])
app.include_router(fundfinder.router, prefix="/agents/fundfinder", tags=["fundfinder"])
app.include_router(careerboost.router, prefix="/agents/careerboost", tags=["careerboost"])
app.include_router(wellness.router, prefix="/agents/wellness", tags=["wellness"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(calendar.router, prefix="/calendar", tags=["calendar"])


@app.get("/health")
def health():
    return {"status": "ok"}
