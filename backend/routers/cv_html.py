from fastapi import APIRouter
from fastapi.responses import HTMLResponse, FileResponse
from typing import Dict, Any
from backend.generator.functions.cv_generator import generate_cv_html, convert_html_to_pdf
import tempfile
import os

router = APIRouter()

# Dummy data for demonstration purposes, replace with actual data fetching from DB/elsewhere
dummy_full_cv = {
    "cv_title": {"cv_title": "Data Scientist Junior – Machine Learning"},
    "objective": {
        "objective": (
            "Étudiant passionné en data science, en recherche d’un poste junior en machine learning "
            "afin de générer un fort impact business grâce aux données."
        )
    },
    "experiences": {
        "experiences": [
            {
                "source_title": "Stagiaire Data Scientist",
                "company": "Airbus",
                "location": "Toulouse, France",
                "start_date": "2024-02",
                "end_date": "2024-08",
                "target_title": "Stagiaire Data Scientist – Maintenance prédictive",
                "bullets": [
                    "Développé des modèles prédictifs améliorant la détection de pannes d’environ 7 % sur plus de 50 000 enregistrements.",
                    "Automatisé des pipelines de données SQL pour des mises à jour quotidiennes utilisées par 3 équipes.",
                    "Réduit le temps de reporting manuel de 2 heures à 30 minutes."
                ],
            }
        ]
    },
    "projects": {
        "projects": [
            {
                "source_title": "Tableau de bord de variabilité glycémique",
                "target_title": "Tableau de bord de variabilité glycémique – D3.js & Wearables",
                "tech_stack": ["Python", "D3.js", "Pandas"],
                "bullets": [
                    "Conçu un tableau de bord interactif pour explorer les données de glucose et d’activité.",
                    "Agrégé des séries temporelles multi-capteurs provenant de 7 jeux de données.",
                    "Accéléré l’exploration des données pour les chercheurs en automatisant les vues clés."
                ],
            }
        ]
    },
    "education": {
        "education": [
            {
                "degree": "Diplôme d’ingénieur en Data Science",
                "school": "IMT Atlantique",
                "location": "France",
                "start_date": "2022",
                "end_date": "2025",
                "bullets": [
                    "Spécialisation en machine learning, statistiques et data engineering."
                ],
            }
        ]
    },
    "interests": {
        "interests": [
            {"label": "Course à pied", "sentence": "Semi-marathons (discipline et persévérance sur le long terme)."},
            {"label": "Échecs", "sentence": "Réflexion stratégique et reconnaissance de motifs."},
        ]
    },
    "skills": {
        "skills": {
            "sections": [
                {
                    "section_title": "Compétences techniques",
                    "items": ["Python", "SQL", "Pandas", "scikit-learn"],
                },
                {
                    "section_title": "Compétences comportementales",
                    "items": ["Travail d’équipe", "Communication", "Résolution de problèmes"],
                },
            ],
            "highlighted": ["Python", "Machine Learning", "SQL"],
        }
    },
}

dummy_contact = {
    "name": "Theau AGUET",
    "city": "France",
    "phone": "+33 7 82 01 83 97",
    "email": "theauaguetpro@gmail.com",
    "linkedin": "theau aguet",
    "github": "the0eau",
    "role": "Data Scientist & Entrepreneur – À la croisée de l’IA, du produit et de la stratégie",
}


@router.get("/cv/html", response_class=HTMLResponse)
async def get_cv_html():
    # In a real application, you would fetch full_cv_content and contact_info from a database
    # based on a user ID or other authentication mechanism.
    
    html_content = generate_cv_html(dummy_full_cv, dummy_contact)
    return html_content

@router.get("/cv/pdf", response_class=FileResponse)
async def get_cv_pdf():
    # In a real application, you would fetch full_cv_content and contact_info from a database
    
    html_content = generate_cv_html(dummy_full_cv, dummy_contact)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        pdf_path = tmp.name
        convert_html_to_pdf(html_content, pdf_path)

    # Return the PDF file
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename="cv.pdf",
        background=background_task_for_cleanup(pdf_path)
    )

def background_task_for_cleanup(path: str):
    """
    Returns a background task that deletes the file at 'path'.
    """
    async def cleanup():
        os.unlink(path)
    return cleanup
