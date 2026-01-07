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
import google.generativeai as genai

load_dotenv()

# ============================================================================
# 1. CONFIG GEMINI
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Fallback sur 1.5-flash si 2.5 est demandé (instabilité JSON connue sur la 2.5)
env_model = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")
GEMINI_MODEL_NAME = "gemini-1.5-flash" if "2.5" in env_model else env_model

genai.configure(api_key=GEMINI_API_KEY)
_gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)


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
        json_str = re.sub(r"([\}\]])\s*(\"[a-zA-Z0-9_]+\"\s*:)", r"\1,\2", json_str)

        # 4. Ajout des virgules manquantes après une valeur simple (nombre, bool, null) et une clé
        # Ex: 10 "scores": -> 10, "scores":
        json_str = re.sub(r"([0-9]+|true|false|null)\s+(\"[a-zA-Z0-9_]+\"\s*:)", r"\1,\2", json_str)
        
        # 5. Ajout des virgules manquantes après une string et une clé
        # Ex: "val" "key": -> "val", "key":
        json_str = re.sub(r"(\")\s+(\"[a-zA-Z0-9_]+\"\s*:)", r"\1,\2", json_str)

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
    Prompt en anglais pour réduire l'ambiguïté.
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
    response = _gemini_model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
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
