"""
compatibility_gemini.py

Use Gemini to compute a compatibility score between:
- a parsed job offer (output of parse_job_offer_gemini)
- a parsed CV/profile (output of parse_cv_with_gemini)

The scoring + advice are done BY GEMINI (LLM), not heuristically.
"""

from __future__ import annotations

import os
import json
import re
from typing import Dict, Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# ============================================================================
# 1. CONFIG GEMINI
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Fallback sur 1.5-flash si 2.5 est demandé (instabilité JSON connue sur la 2.5)
env_model = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")
GEMINI_MODEL_NAME = "gemini-1.5-flash" if "2.5" in env_model else env_model

_client = genai.Client(api_key=GEMINI_API_KEY)


# ============================================================================
# 2. OUTIL : extraction du JSON renvoyé par le modèle
# ============================================================================

def extract_json_from_output(output: str) -> Dict[str, Any]:
    """
    Extract a JSON object from the model's raw text output.

    - If the output is already pure JSON, parse directly.
    - Otherwise, find the first {...} block.
    """
    output = output.strip()
    
    # 1. Gestion des blocs Markdown (```json ... ```)
    if "```" in output:
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", output, flags=re.DOTALL)
        if match:
            output = match.group(1)
        else:
            output = re.sub(r"^```[a-zA-Z0-9]*\s*", "", output)
            output = re.sub(r"\s*```$", "", output)

    # 2. Extraction du bloc JSON
    match = re.search(r"\{.*\}", output, flags=re.DOTALL)
    if match:
        json_str = match.group(0)
    else:
        json_str = output

    # 3. Parsing avec tentative de nettoyage des commentaires
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Tentative de réparation du JSON
        # 1. Suppression des commentaires // (sauf si dans une URL http://)
        json_str = re.sub(r"(?<!:)\/\/.*", "", json_str)
        # 2. Suppression des virgules traînantes (trailing commas)
        json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
        
        # 3. Ajout des virgules manquantes entre un bloc fermant et une clé suivante
        # Ex: } "summary": -> }, "summary":
        json_str = re.sub(r"([\}\]])\s*(\"[^\"]+\"\s*:)", r"\1,\2", json_str)

        # 4. Ajout des virgules manquantes après une valeur simple (nombre, bool, null) et une clé
        # Ex: 10 "scores": -> 10, "scores":
        json_str = re.sub(r"([0-9]+|true|false|null)\s+(\"[^\"]+\"\s*:)", r"\1,\2", json_str)
        
        # 5. Ajout des virgules manquantes après une string et une clé
        # Ex: "val" "key": -> "val", "key":
        json_str = re.sub(r"(\")\s+(\"[^\"]+\"\s*:)", r"\1,\2", json_str)

        # 6. Nettoyage des pourcentages ou fractions dans les valeurs numériques (ex: 20% -> 20)
        # Gemini a tendance à mettre "match": 20%
        json_str = re.sub(r":\s*(\d+)\s*[%]", r": \1", json_str)
        json_str = re.sub(r":\s*(\d+)\s*/\s*100", r": \1", json_str)

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Erreur de parsing JSON : {e}\n"
                f"Sortie brute : {output[:500]}..."
            )


# ============================================================================
# 3. PROMPT DE COMPATIBILITÉ
# ============================================================================

def build_compat_prompt(offer_parsed: Dict[str, Any], cv_parsed: Dict[str, Any]) -> str:
    """
    Construis le prompt envoyé à Gemini pour calculer le score + conseils.
    """
    offer_json = json.dumps(offer_parsed, ensure_ascii=False, indent=2)
    cv_json = json.dumps(cv_parsed, ensure_ascii=False, indent=2)

    return f"""
You are an expert recruiter and career coach.

Your task:
Evaluate how well THIS CANDIDATE matches THIS JOB OFFER, based on their
parsed JSON representations, and return a detailed compatibility analysis.

You MUST return STRICTLY a valid JSON object, with NO explanation, NO text
before, and NO text after.

====================
JOB OFFER (parsed JSON)
====================
{offer_json}

====================
CANDIDATE PROFILE (parsed CV JSON)
====================
{cv_json}

====================
OUTPUT JSON SPEC
====================

You MUST return a JSON object with EXACTLY these fields:

{{
  "overall_score": 0,

  "scores": {{
    "skills_match": 0,
    "experience_match": 0,
    "education_match": 0,
    "language_match": 0
  }},

  "summary": "string",

  "key_strengths": [
    "string"
  ],

  "key_gaps": [
    "string"
  ],

  "missing_hard_skills": [
    "string"
  ],

  "missing_soft_skills": [
    "string"
  ],

  "recommended_improvements": [
    "string"
  ],

  "recommended_projects_or_experiences": [
    "string"
  ],

  "recommended_courses_or_certifications": [
    "string"
  ]
}}

VERY IMPORTANT RULES:
- The response for all string fields in the JSON output (summary, strengths, gaps, etc.) MUST be in French.
- You MUST return ONLY the JSON object, with no markdown or extra text.
- Each score must be in the range [0,100].
- Do NOT include comments in the JSON output.
- Be realistic and fair: do not give 95+ unless the match is extremely strong.
- "missing_hard_skills" and "missing_soft_skills" must be based on the job offer vs the CV.
- "recommended_improvements" must be concrete and actionable (CV bullets, skills to add, etc.).
- Do NOT invent fake job titles or degrees; strictly base your reasoning on the JSON inputs.
- If a section (e.g. Experience, Education) is empty in the CV, the corresponding score MUST be low (or 0). Do NOT assume the candidate has experience if it is not listed.
"""


# ============================================================================
# 4. APPEL À GEMINI
# ============================================================================

def generate_with_gemini(prompt: str) -> str:
    """
    Call Gemini with the given prompt and return the raw text output.
    """
    response = _client.models.generate_content(
        model=GEMINI_MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=2048,
        ),
    )
    try:
        return response.text
    except AttributeError:
        if hasattr(response, "candidates") and response.candidates:
            parts = []
            for cand in response.candidates:
                if not cand.content:
                    continue
                for p in cand.content.parts:
                    if getattr(p, "text", None):
                        parts.append(p.text)
            return "\n".join(parts)
        raise RuntimeError(f"Réponse Gemini inattendue : {response!r}")


def score_profile_with_gemini(
    offer_parsed: Dict[str, Any],
    cv_parsed: Dict[str, Any],
) -> Dict[str, Any]:
    """
    High-level: prend l'offre parsée + le CV parsé,
    appelle Gemini pour obtenir score + conseils.
    """
    prompt = build_compat_prompt(offer_parsed, cv_parsed)
    raw_output = generate_with_gemini(prompt)
    parsed_json = extract_json_from_output(raw_output)
    return parsed_json


# ============================================================================
# 5. DEMO EN LOCAL
# ============================================================================

if __name__ == "__main__":
    # Mini exemple : schemas simplifiés / fake
    offer_demo = {
        "title": "Data Scientist Junior",
        "company_name": "Airbus",
        "location": "Toulouse",
        "contract_type": "CDI",
        "seniority_level": "Junior",
        "Education": ["Diplôme d'ingénieur en Data Science"],
        "hard_skills": ["Python", "SQL", "Machine Learning"],
        "soft_skills": ["teamwork", "communication"],
        "missions": [
            "Develop machine learning models in Python.",
            "Collaborate with cross-functional engineering teams."
        ],
        "requirements": [
            "1–2 years of experience in data science (internship included)."
        ],
        "language": "fr"
    }

    cv_demo = {
        "first_name": "Theau",
        "last_name": "Aguet",
        "full_name": "Theau AGUET",
        "contacts": {
            "emails": ["theauaguetpro@gmail.com"],
            "phones": ["+33 7 82 01 83 97"],
            "locations": ["France"]
        },
        "websites": [],
        "social_links": [],
        "skills": {
            "hard_skills": ["Python", "SQL", "Pandas", "Machine Learning"],
            "soft_skills": ["Teamwork", "Problem-solving"],
            "languages": ["French (C1)", "English (C1)"]
        },
        "professional_experiences": [
            {
                "title": "Data Science Intern",
                "company": "Airbus",
                "location": "Toulouse",
                "start_date": "Feb 2024",
                "end_date": "Aug 2024",
                "description": "Worked on predictive maintenance models in Python and SQL."
            }
        ],
        "academic_projects": [],
        "education": [
            {
                "degree": "Diplôme d'ingénieur en Data Science",
                "school": "IMT Atlantique",
                "location": "France",
                "start_date": "2022",
                "end_date": "2025",
                "description": "Specialization in ML, statistics, data engineering."
            }
        ],
        "certifications": [],
        "interests": ["Running", "Chess"],
        "raw_summary": "Junior data scientist with internship at Airbus."
    }

    print("[INFO] Scoring compatibility with Gemini...")
    result = score_profile_with_gemini(offer_demo, cv_demo)
    print(json.dumps(result, indent=2, ensure_ascii=False))


# ============================================================================
# 6. SCORING HEURISTIQUE (RAPIDE)
# ============================================================================

def compute_heuristic_score(offer_parsed: Dict[str, Any], cv_parsed: Dict[str, Any]) -> int:
    """
    Calcule un score de compatibilité rapide (0-100) sans appel à l'IA.
    Basé sur :
    1. La couverture des Hard Skills (70%)
    2. La présence des mots-clés du titre de l'offre dans le CV (30%)
    """
    # Helper pour normaliser (minuscules, sans espaces inutiles)
    def normalize_set(items):
        if not items: return set()
        return {str(i).lower().strip() for i in items if i}

    # 1. Extraction des données
    offer_skills = normalize_set(offer_parsed.get("hard_skills", []))
    
    cv_skills_data = cv_parsed.get("skills", {})
    # Gestion robuste si skills est une liste ou un dict
    if isinstance(cv_skills_data, dict):
        cv_skills = normalize_set(cv_skills_data.get("hard_skills", []))
    elif isinstance(cv_skills_data, list):
        cv_skills = normalize_set(cv_skills_data)
    else:
        cv_skills = set()

    # 2. Score Compétences (Combien de skills demandés sont possédés ?)
    skill_score = 0.0
    if offer_skills:
        intersection = offer_skills.intersection(cv_skills)
        skill_score = (len(intersection) / len(offer_skills)) * 100
    else:
        # Si l'offre ne liste pas de hard_skills, on met un score neutre
        skill_score = 50.0

    # 3. Score Sémantique basique (Titre offre vs Contenu CV)
    title_score = 0.0
    offer_title = str(offer_parsed.get("title", "")).lower()
    
    if offer_title:
        # Mots vides à ignorer pour ne garder que les mots importants
        stop_words = {"h/f", "(h/f)", "f/h", "m/f", "-", "de", "le", "la", "les", "et", "ou", "pour", "stage", "alternance", "cdi", "cdd"}
        offer_keywords = {w for w in offer_title.split() if w not in stop_words and len(w) > 2}
        
        # Construction du corpus CV (Résumé + Titres expériences)
        cv_text = str(cv_parsed.get("raw_summary", "")).lower()
        experiences = cv_parsed.get("professional_experiences", [])
        if isinstance(experiences, list):
            for exp in experiences:
                cv_text += " " + str(exp.get("title", "")).lower()
        
        if offer_keywords:
            matches = sum(1 for w in offer_keywords if w in cv_text)
            title_score = (matches / len(offer_keywords)) * 100
    
    # 4. Pondération finale
    if not offer_skills:
        final_score = title_score
    elif not offer_title:
        final_score = skill_score
    else:
        final_score = (skill_score * 0.7) + (title_score * 0.3)

    return int(min(100, max(0, final_score)))