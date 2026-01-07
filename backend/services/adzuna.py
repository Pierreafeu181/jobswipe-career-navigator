import os, httpx
from datetime import datetime

APP_ID = os.getenv("ADZUNA_APP_ID", "")
APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
BASE = "https://api.adzuna.com/v1/api/jobs/fr/search/{page}"

def adzuna_search(what: str, where: str, contract: str = "internship", page: int = 1, per_page: int = 20):
    if not APP_ID or not APP_KEY:
        raise RuntimeError("ADZUNA_APP_ID/ADZUNA_APP_KEY not configured")
    params = {
        "app_id": APP_ID,
        "app_key": APP_KEY,
        "what": what,
        "where": where,
        "results_per_page": per_page,
        "content-type": "application/json",
        "contract": contract,  # internship (stage) ; apprenticeship (alternance)
        "max_days_old": 30,
        "sort_by": "date",
    }
    url = BASE.format(page=page)
    with httpx.Client(timeout=20.0) as client:
        r = client.get(url, params=params)
        r.raise_for_status()
        data = r.json()
    results = []
    for j in data.get("results", []):
        results.append({
            "title": j.get("title"),
            "company": (j.get("company") or {}).get("display_name"),
            "location": (j.get("location") or {}).get("display_name"),
            "url": j.get("redirect_url"),
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
            "created": j.get("created"),
            "created_date": j.get("created")[:10] if j.get("created") else None,
            "source": "Adzuna",
            "contract": contract,
        })
    return results
