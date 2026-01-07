import os
import json
import re
from typing import Dict, Any, List
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ============================================================================
# 1. CONFIGURATION GEMINI
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY est manquant.")

genai.configure(api_key=GEMINI_API_KEY)
_gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)

# ============================================================================
# 2. UTILITAIRES
# ============================================================================

def _generate_content(prompt: str) -> str:
    response = _gemini_model.generate_content(prompt)
    return response.text.strip()

def _extract_json(output: str) -> Any:
    text = output.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*", "", text)
        text = re.sub(r"```$", "", text).strip()
    
    match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.DOTALL)
    if match:
        text = match.group(0)
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        raise ValueError(f"Impossible de parser le JSON : {text[:100]}...")

# ============================================================================
# 3. SÉLECTEUR UNIQUE (ONE-SHOT)
# ============================================================================

def select_all_relevant_content(
    offer: Dict[str, Any],
    user_data: Dict[str, Any],
    limits: Dict[str, int] = {"exp": 3, "proj": 2, "act": 3}
) -> Dict[str, Any]:
    """
    Analyse l'ensemble du profil et sélectionne les éléments les plus stratégiques
    pour l'offre d'emploi en un seul appel.
    """
    
    prompt = f"""
Tu es un expert en recrutement stratégique. Ta mission est de filtrer le profil d'un candidat pour ne garder que les éléments qui maximisent ses chances pour un poste spécifique.

### OFFRE D'EMPLOI CIBLE
{json.dumps(offer, ensure_ascii=False, indent=2)}

### PROFIL COMPLET DU CANDIDAT
{json.dumps(user_data, ensure_ascii=False, indent=2)}

### CRITÈRES DE SÉLECTION
1. **Expériences** : Sélectionne les {limits['exp']} meilleures. Priorise l'impact direct et la similarité des missions.
2. **Projets** : Sélectionne les {limits['proj']} meilleurs. Priorise la stack technique commune avec l'offre.
3. **Compétences** : Filtre pour ne garder que les compétences utiles au poste (Hard & Soft).
4. **Activités** : Sélectionne les {limits['act']} plus valorisantes (ex: leadership, esprit d'équipe).

### FORMAT DE SORTIE (JSON STRICT)
Retourne UNIQUEMENT un objet JSON avec cette structure :
{{
  "selected_experiences": [ {{ "source_title": "string", "company": "string" }} ],
  "selected_projects": [ {{ "title": "string" }} ],
  "selected_skills": {{ "hard_skills": [], "soft_skills": [], "tools": [] }},
  "selected_interests": [ "string" ]
}}
Note : Pour les expériences et projets, retourne l'objet complet tel qu'il apparaît dans la source.
"""

    try:
        raw_response = _generate_content(prompt)
        selected_data = _extract_json(raw_response)
        
        # Mapping de sécurité pour s'assurer qu'on renvoie des listes
        return {
            "experiences": selected_data.get("selected_experiences", []),
            "projects": selected_data.get("selected_projects", []),
            "skills": selected_data.get("selected_skills", {}),
            "interests": selected_data.get("selected_interests", [])
        }
    except Exception as e:
        print(f"[ERROR] Échec de la sélection centralisée : {e}")
        # Fallback basique (tranchage manuel)
        return {
            "experiences": user_data.get("experiences", [])[:limits['exp']],
            "projects": user_data.get("projects", [])[:limits['proj']],
            "skills": user_data.get("skills", {}),
            "interests": user_data.get("interests", [])[:limits['act']]
        }

# ============================================================================
# 4. EXEMPLE D'UTILISATION
# ============================================================================

if __name__ == "__main__":
    offer_demo = {
        "title": "Développeur Fullstack React/Node",
        "keywords": ["TypeScript", "AWS", "Agile"]
    }
    
    user_data_demo = {
        "experiences": [
            {"source_title": "Dev Junior", "company": "TechCorp", "desc": "React & Redux"},
            {"source_title": "Vendeur", "company": "Shop", "desc": "Vente de détail"},
            {"source_title": "Freelance", "company": "Solo", "desc": "Node.js API"}
        ],
        "projects": [
            {"title": "E-commerce App", "tech": "React"},
            {"title": "Blog Personnel", "tech": "HTML/CSS"},
            {"title": "Outil Automation", "tech": "Python"}
        ],
        "skills": {
            "hard_skills": ["React", "Node", "Python", "SQL", "Excel"],
            "soft_skills": ["Autonomie", "Vente", "Code Review"]
        },
        "interests": ["Randonnée", "Open Source", "Cuisine", "Tournois d'échecs"]
    }

    print("--- Sélection intelligente du contenu ---")
    result = select_all_relevant_content(offer_demo, user_data_demo)
    print(json.dumps(result, indent=2, ensure_ascii=False))