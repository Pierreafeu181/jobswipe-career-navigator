import os
import json
import uuid
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Chargement des variables d'environnement
load_dotenv()

# Imports robustes (gère l'exécution directe ou via package)
try:
    from .cv_parsing import parse_cv_with_gemini
    from .job_offer_parser import parse_job_offer_gemini
    from .compatibility import score_profile_with_gemini, compute_heuristic_score
    from .experience_generator import generate_full_cv_content
    from .cv_generator import generate_cv_html, convert_html_to_pdf
    from .cover_letter_generator import generate_personalized_cover_letter_docx_and_pdf
except ImportError:
    from cv_parsing import parse_cv_with_gemini
    from job_offer_parser import parse_job_offer_gemini
    from compatibility import score_profile_with_gemini, compute_heuristic_score
    from experience_generator import generate_full_cv_content
    from cv_generator import generate_cv_html, convert_html_to_pdf
    from cover_letter_generator import generate_personalized_cover_letter_docx_and_pdf

class JobSwipeGeneratorService:
    """
    Service centralisant toute la logique de génération de candidature.
    """
    
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir, exist_ok=True)

    def parse_data(self, cv_text: str, offer_text: str) -> Dict[str, Any]:
        """
        Helper pour parser les données brutes.
        """
        cv_parsed = parse_cv_with_gemini(cv_text)
        offer_parsed = parse_job_offer_gemini(offer_text)
        return {
            "cv_parsed": cv_parsed,
            "offer_parsed": offer_parsed
        }

    def process_cv(
        self, 
        cv_parsed: Dict[str, Any],
        offer_parsed: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Génère uniquement le CV (Content -> PDF).
        Suppose que le parsing est déjà fait.
        """
        results = {}

        results['cv_parsed'] = cv_parsed
        results['offer_parsed'] = offer_parsed

        # 2. Génération Contenu CV (One-Shot)
        user_data = {
            "profile": {"summary": cv_parsed.get("raw_summary")},
            "experiences": cv_parsed.get("professional_experiences", []),
            "projects": cv_parsed.get("academic_projects", []),
            "education": cv_parsed.get("education", []),
            "skills": cv_parsed.get("skills", {}),
            "interests": cv_parsed.get("interests", [])
        }
        generated_content = generate_full_cv_content(offer_parsed, user_data)
        results['generated_content'] = generated_content

        # 3. Rendu PDF du CV
        full_cv_content = {
            "cv_title": {"cv_title": generated_content.get("cv_title")},
            "objective": {"objective": generated_content.get("objective")},
            "experiences": {"experiences": generated_content.get("experiences", [])},
            "projects": {"projects": generated_content.get("projects", [])},
            "education": {"education": generated_content.get("education", [])},
            "skills": {"skills": generated_content.get("skills", {})},
            "interests": {"interests": generated_content.get("interests", [])}
        }

        contacts = cv_parsed.get("contacts", {})
        contact_info = {
            "name": cv_parsed.get("full_name", "Candidat"),
            "city": (contacts.get("locations") or [""])[0],
            "phone": (contacts.get("phones") or [""])[0],
            "email": (contacts.get("emails") or [""])[0],
            "linkedin": "", 
            "github": "",
            "role": generated_content.get("cv_title", "Candidat")
        }
        
        for link in cv_parsed.get("social_links", []):
            url = link.get("url", "")
            platform = link.get("platform", "").lower()
            if "linkedin" in url.lower() or "linkedin" in platform:
                contact_info["linkedin"] = url
            elif "github" in url.lower() or "github" in platform:
                contact_info["github"] = url

        # Injection des infos de contact pour le frontend
        generated_content["contact_info"] = contact_info

        html_cv = generate_cv_html(full_cv_content, contact_info)
        
        cv_base_name = f"cv_optimized_{uuid.uuid4().hex}"
        html_path = os.path.join(self.output_dir, f"{cv_base_name}.html")
        pdf_path = os.path.join(self.output_dir, f"{cv_base_name}.pdf")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_cv)
        
        convert_html_to_pdf(html_cv, pdf_path)
        results['paths'] = {
            'cv_html': html_path,
            'cv_pdf': pdf_path
        }
        return results

    def process_motivation(
        self, 
        cv_parsed: Dict[str, Any],
        offer_parsed: Dict[str, Any],
        gender: str = "M"
    ) -> Dict[str, Any]:
        """
        Génère uniquement la lettre de motivation.
        Suppose que le parsing est déjà fait.
        """
        results = {}

        results['cv_parsed'] = cv_parsed
        results['offer_parsed'] = offer_parsed

        # 2. Génération Lettre de Motivation
        cl_result = generate_personalized_cover_letter_docx_and_pdf(
            offer_parsed=offer_parsed,
            cv_parsed=cv_parsed,
            output_dir=self.output_dir,
            docx_filename=f"cover_letter_{uuid.uuid4().hex}.docx",
            gender=gender
        )
        results['paths'] = {
            'cl_docx': cl_result['docx_path'],
            'cl_pdf': cl_result['pdf_path']
        }
        results['generated_content'] = cl_result['chunks']
        return results

    def process_scoring(
        self, 
        cv_data: Dict[str, Any],
        offer_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcule le score de compatibilité via Gemini.
        """
        compatibility = score_profile_with_gemini(offer_data, cv_data)
        return compatibility

    def compute_fast_score(
        self, 
        cv_data: Dict[str, Any],
        offer_data: Dict[str, Any]
    ) -> int:
        """
        Calcule un score heuristique rapide (0-100) pour l'affichage liste.
        """
        return compute_heuristic_score(offer_data, cv_data)

    def parse_only_offer(self, offer_text: str) -> Dict[str, Any]:
        """
        Parse uniquement le texte d'une offre d'emploi.
        """
        return parse_job_offer_gemini(offer_text)