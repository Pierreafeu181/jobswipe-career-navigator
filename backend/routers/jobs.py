from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.adzuna import adzuna_search

router = APIRouter()

class JobSearchIn(BaseModel):
    intitule: str | None = None
    lieu: str | None = None
    contrat: str | None = "internship"  # internship | apprenticeship
    remote_min: int | None = None
    salaire_min_eur: int | None = None
    page: int = 1
    per_page: int = 20

@router.post("/search")
def search(in_: JobSearchIn):
    try:
        results = adzuna_search(
            what=in_.intitule or "",
            where=in_.lieu or "",
            contract=in_.contrat or "internship",
            page=in_.page,
            per_page=in_.per_page,
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
