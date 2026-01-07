from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, jobs, alerts, cv_html
import os

app = FastAPI(title="JobBot Alternance API", version="0.1.0")

origins = os.getenv("ALLOW_ORIGINS", "http://localhost:19006").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
app.include_router(cv_html.router) # No prefix for the CV HTML endpoint, or a suitable one

@app.get("/health")
def health():
    return {"status": "ok"}
