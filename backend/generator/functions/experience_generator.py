import json
import os
import re
from typing import Dict, Any, List
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ============================================================================
# 1. CONFIGURATION
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY manquante.")

genai.configure(api_key=GEMINI_API_KEY)
_gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)

# ============================================================================
# 2. UTILS
# ============================================================================

def _generate_with_gemini(prompt: str) -> str:
    response = _gemini_model.generate_content(prompt)
    return response.text.strip()

def _extract_json(output: str) -> Dict[str, Any]:
    text = output.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*", "", text)
        text = re.sub(r"```$", "", text).strip()
    
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("Impossible de trouver le JSON dans la réponse.")
    
    json_str = match.group(0)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Réparation basique du JSON
        json_str = re.sub(r"(?<!:)\/\/.*", "", json_str) # Commentaires
        json_str = re.sub(r",\s*([\]}])", r"\1", json_str) # Virgules en trop
        json_str = re.sub(r"([\}\]])\s*(\"[a-zA-Z0-9_]+\"\s*:)", r"\1,\2", json_str) # Virgules manquantes
        return json.loads(json_str)

# ============================================================================
# 3. GENERATEUR UNIQUE (ONE-SHOT)
# ============================================================================

def generate_full_cv_content(offer_parsed: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Génère l'intégralité du contenu du CV en un seul appel API pour garantir
    la cohérence, réduire la latence et optimiser les coûts.
    """
    
    prompt = f"""
Tu es un expert en recrutement et optimisation de CV (ATS Friendly).
Ton rôle est de réécrire les données de l'utilisateur pour qu'elles matchent parfaitement avec l'offre d'emploi.

### DONNÉES CIBLES (OFFRE)
{json.dumps(offer_parsed, ensure_ascii=False, indent=2)}

### DONNÉES SOURCES (UTILISATEUR)
{json.dumps(user_data, ensure_ascii=False, indent=2)}

### DIRECTIVES DE RÉDACTION
1. **Langue** : Utilise la langue principale de l'offre d'emploi.
2. **Fidélité STRICTE** : N'invente AUCUNE expérience, formation, projet ou compétence. Utilise UNIQUEMENT les informations fournies dans les DONNÉES SOURCES.
3. **Sections vides** : Si une section (ex: projets, expériences) est vide ou absente dans les données sources, renvoie une liste vide `[]` ou `null` dans le JSON de sortie. NE PAS inventer de contenu pour combler.
4. **Amélioration** : Tu peux reformuler et améliorer les descriptions existantes (mots-clés, structure C.A.R.) pour mieux coller à l'offre, mais sans ajouter de faits non présents.
5. **Impact** : Mets en valeur les résultats chiffrés UNIQUEMENT s'ils sont présents ou déductibles logiquement des données sources.
6. **Vérification** : Avant de générer un point, demande-toi : "Est-ce que cette information est présente dans le profil source ?". Si non, ne l'inclus pas.

### STRUCTURE DE SORTIE (JSON STRICT)
Retourne UNIQUEMENT un objet JSON avec cette structure exacte :
{{
  "cv_title": "Titre du CV aligné sur le poste",
  "objective": "Résumé professionnel percutant (2-3 phrases)",
  "experiences": [
    {{
      "source_title": "Titre original",
      "target_title": "Titre optimisé",
      "company": "Entreprise",
      "location": "Ville, Pays",
      "start_date": "Date début (ex: Jan 2024)",
      "end_date": "Date fin (ex: Present)",
      "bullets": ["Point 1 avec chiffre", "Point 2 avec chiffre", "Point 3 avec chiffre"]
    }}
  ],
  "projects": [
    {{
      "target_title": "Nom du projet",
      "tech_stack": ["Outil 1", "Outil 2"],
      "bullets": ["Action et résultat concret"]
    }}
  ],
  "education": [
    {{
      "degree": "Diplôme",
      "school": "École",
      "location": "Ville, Pays",
      "start_date": "Date début",
      "end_date": "Date fin",
      "bullets": ["Spécialité ou projet académique pertinent"]
    }}
  ],
  "skills": {{
    "sections": [{{ "section_title": "Nom de catégorie", "items": ["Compétence"] }}],
    "highlighted": ["Top 8 compétences clés pour ce poste"]
  }},
  "interests": [{{ "label": "Loisir", "sentence": "Description valorisant une soft skill" }}]
}}
"""
    raw_response = _generate_with_gemini(prompt)
    return _extract_json(raw_response)

# ============================================================================
# 4. EXECUTION
# ============================================================================

if __name__ == "__main__":
    # Données de test regroupées
    offer = {
        "title": "Data Scientist Junior",
        "company_name": "Airbus",
        "hard_skills": ["Python", "Machine Learning", "SQL", "Power BI"],
        "language": "fr"
    }

    user_data = {
        "profile": {
            "current_title": "Étudiant Data Science",
            "summary": "Passionné par l'aéronautique et le ML."
        },
        "experiences": [
            {
                "title": "Stagiaire Data Scientist",
                "company": "Airbus",
                "location": "Toulouse",
                "start_date": "Feb 2024",
                "end_date": "Aug 2024",
                "description": "Maintenance prédictive, SQL, Dashboards."
            }
        ],
        "projects": [
            {
                "title": "Analyse Capteurs",
                "tech_stack": ["Python", "Pandas"],
                "description": "Détection d'anomalies sur des moteurs."
            }
        ],
        "education": [
            {"degree": "Master Data Science", "school": "IMT Atlantique", "location": "Brest", "start_date": "2022", "end_date": "2025"}
        ],
        "skills": {
            "hard_skills": ["Python", "SQL", "Tableau"],
            "soft_skills": ["Autonomie", "Rigueur"]
        },
        "interests": ["Aéromodélisme", "Échecs"]
    }

    print("--- Génération du CV complet en cours ---")
    try:
        full_cv = generate_full_cv_content(offer, user_data)
        print(json.dumps(full_cv, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Erreur : {e}")