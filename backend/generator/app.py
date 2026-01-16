import os
import sys
import base64
import traceback
import time
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ajout du dossier courant au path pour garantir l'import du module functions
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from functions.generator_service import JobSwipeGeneratorService

app = FastAPI(title="JobSwipe Generator API", version="1.0")

# Configuration des origines autorisées pour CORS
origins = [
    "http://localhost:5173",      # Développement local Vite
    "http://localhost:8080",      # Développement local (port actuel)
    "http://localhost:3000",      # Développement local alternatif
    "https://jobswipe-procom.github.io",  # Production (GitHub Pages)
    "http://10.144.200.85:8080",
]

# Ajout d'une origine supplémentaire via variable d'environnement (ex: pour Render/Vercel previews)
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

# Configuration CORS pour permettre les appels depuis le frontend (React)
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],  # En prod, remplacez par l'URL de votre frontend (ex: http://localhost:5173)
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisation du service
# Les fichiers seront générés dans un dossier 'output_api' par défaut
OUTPUT_DIR = os.path.join(os.getcwd(), "output_api")
service = JobSwipeGeneratorService(output_dir=OUTPUT_DIR)

class ApplicationRequest(BaseModel):
    cv_data: Dict[str, Any]
    offer_data: Dict[str, Any]
    gender: str = "M"  # "M" pour masculin, "F" pour féminin

class JobTextRequest(BaseModel):
    text: str

@app.post("/generate-cv")
async def generate_cv(request: ApplicationRequest):
    """
    Génère uniquement le CV optimisé (PDF).
    """
    try:
        results = service.process_cv(request.cv_data, request.offer_data)
        
        response_data = {"files": {}}
        # Encodage du CV PDF
        if "cv_pdf" in results.get("paths", {}):
            with open(results["paths"]["cv_pdf"], "rb") as f:
                response_data["files"]["cv_pdf"] = base64.b64encode(f.read()).decode("utf-8")

        # Ajout du contenu structuré pour l'affichage frontend
        response_data["content"] = results.get("generated_content", {})

        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-cover-letter")
async def generate_cover_letter(request: ApplicationRequest):
    """
    Génère uniquement la lettre de motivation (PDF).
    """
    try:
        results = service.process_motivation(
            request.cv_data, request.offer_data, gender=request.gender
        )
        
        response_data = {"files": {}}
        # Encodage de la Lettre PDF
        if "cl_pdf" in results.get("paths", {}):
            with open(results["paths"]["cl_pdf"], "rb") as f:
                response_data["files"]["cl_pdf"] = base64.b64encode(f.read()).decode("utf-8")
        
        # Ajout du contenu structuré pour l'affichage frontend
        response_data["content"] = results.get("generated_content", {})

        return response_data
    except Exception as e:
        print(f"ERREUR 500 dans /generate-cover-letter : {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/score-application")
async def score_application(request: ApplicationRequest):
    """
    Calcule le score de compatibilité et fournit une analyse détaillée.
    """
    try:
        results = service.process_scoring(request.cv_data, request.offer_data)
        return results
    except Exception as e:
        print(f"ERREUR 500 dans /score-application : {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/score-fast")
async def score_fast(request: ApplicationRequest):
    """
    Calcule un score rapide (heuristique) pour l'affichage en liste.
    Retourne un entier entre 0 et 100.
    """
    try:
        score = service.compute_fast_score(request.cv_data, request.offer_data)
        return {"score": score}
    except Exception as e:
        print(f"ERREUR 500 dans /score-fast : {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse-job")
async def parse_job(request: JobTextRequest):
    """
    Parse un texte d'offre d'emploi brut en JSON structuré.
    """
    try:
        result = service.parse_only_offer(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse-cv-upload")
async def parse_cv_upload(
    file: UploadFile = File(...),
    current_profile: Optional[str] = Form(None)
):
    """
    Reçoit un fichier (PDF ou DOCX), extrait le texte et retourne le profil structuré JSON.
    """
    try:
        content = await file.read()
        profile_data = None
        if current_profile:
            try:
                profile_data = json.loads(current_profile)
            except:
                pass # Ignore if invalid JSON
        
        result = service.parse_cv_document(content, file.filename, current_profile=profile_data)
        return result
    except Exception as e:
        print(f"ERREUR dans /parse-cv-upload : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse du CV : {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)