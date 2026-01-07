# JobBot Alternance – Backend (FastAPI)

## Prérequis
- Python 3.11+
- `pip` ou `uv`
- Compte Adzuna API (ID/KEY)
- (Optionnel) Supabase pour auth/historique

## Démarrage rapide
```bash
cp .env.example .env
# éditez .env avec vos clés
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API disponible sur: http://localhost:8000

## Endpoints
- `POST /chat/parse` : extrait intent/slots depuis une requête naturelle
- `POST /jobs/search` : cherche des offres (Adzuna) selon les paramètres
- `POST /alerts/preview` : renvoie les nouvelles offres pour une alerte donnée

## Variables d'environnement
Voir `.env.example`.
