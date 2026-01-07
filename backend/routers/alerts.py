from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class AlertPreviewIn(BaseModel):
    query: str
    location: str | None = None

@router.post("/preview")
def preview(in_: AlertPreviewIn):
    # Placeholder: renvoie un exemple ; à relier à jobs.search + logiques d'alertes
    return {"new_jobs": 3, "sample_titles": ["Alternance Data Analyst", "Stage Data Engineer", "Stage BI Junior"]}
