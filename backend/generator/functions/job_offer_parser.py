"""
job_offer_parser.py

Parsing d'offre d'emploi avec Gemini (API Google).

- Pas de torch
- Pas de transformers
- Pas de backend local / Ollama

Il suffit de :
1) Installer la lib :  pip install google-generativeai
2) Définir la variable d'environnement GEMINI_API_KEY
"""

from __future__ import annotations

import json
import os
import re
from typing import Dict, Any

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ============================================================================
# 1. CONFIG GEMINI
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")

if not GEMINI_API_KEY:
    # Tu peux remplacer par une ValueError si tu préfères crasher fort
    raise RuntimeError(
        "GEMINI_API_KEY est introuvable dans les variables d'environnement. "
        "Définis GEMINI_API_KEY avant de lancer le script."
    )

genai.configure(api_key=GEMINI_API_KEY)
_gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)


# ============================================================================
# 2. OUTILS : détection langue, prompt, extraction JSON
# ============================================================================

def detect_language(text: str) -> str:
    """
    Détection de langue très simple : FR vs EN,
    basée sur quelques marqueurs courants.
    """
    text_lower = text.lower()

    french_markers = [
        " vos missions", "profil recherché", "poste",
        "cdi", "stage", "alternance", "bac+",
        " nous recherchons", "vous serez en charge",
    ]
    english_markers = [
        " responsibilities", "requirements", "job description",
        "full-time", " we are looking for", "bachelor", "master's degree",
    ]

    fr_score = sum(text_lower.count(m) for m in french_markers)
    en_score = sum(text_lower.count(m) for m in english_markers)

    return "fr" if fr_score >= en_score else "en"


def build_parsing_prompt(offer_text: str, language: str) -> str:
    """
    Builds the prompt sent to Gemini using the required JSON schema.
    The prompt is fully in English (regardless of the job offer language).
    """
    return f"""
You are an AI expert specialized in parsing job postings.

Your task:
Extract structured information from the job posting below and return
STRICTLY a valid JSON object, with NO explanation, NO text before,
and NO text after.

⚠️ VERY IMPORTANT — The JSON MUST contain ALL of the following fields,
with EXACTLY these names:

{{
  "title": string | null,            // Job title
  "company_name": string | null,     // Employer name
  "location": string | null,         // City / country / Remote
  "contract_type": string | null,    // e.g., "Full-time", "Internship", "Apprenticeship", "CDI", "CDD", etc.
  "seniority_level": string | null,  // e.g., "Junior", "Senior", "Intern", etc.
  "Education": string[],             // Degrees / fields of study only (e.g., "Master in Data Science")
  "hard_skills": string[],           // Technical skills only (e.g., "Python", "SQL")
  "soft_skills": string[],           // Interpersonal / behavioral skills (e.g., "teamwork", "communication")
  "missions": string[],              // Short sentences describing responsibilities
  "requirements": string[],          // Short sentences focusing on years of experience required (e.g., "3+ years in data analysis")
  "keywords": string[],    // Most relevant, high-signal terms appearing in the job offer
  "salary": string | null, // Salary range or amount if specified (e.g. "40k-50k", "500€/day"), null otherwise
  "description": string | null,      // Full, raw, and cleaned-up job description text
  "language": "fr" | "en"             // The language of the job posting (French or English)
}}

Rules you MUST follow:
- Return ONLY the JSON — no markdown, no backticks, no comments, no text outside the JSON.
- If a field is unknown, set null or [] depending on the expected type.
- Lists must NOT contain duplicates.
- "Education" must include ONLY degrees / diplomas / study fields (no skills).
- "requirements" must focus on experience duration (years / seniority).
- "language" must reflect the job posting's language (not this prompt).

Job posting to parse:
\"\"\" 
{offer_text}
\"\"\" 
"""



def extract_json_from_output(output: str) -> Dict[str, Any]:
    """
    Tente d'extraire un objet JSON depuis la sortie de Gemini.

    - Si la sortie est déjà un JSON pur, on parse directement.
    - Sinon, on cherche le premier bloc {...}.
    """
    output = output.strip()

    # Petit garde-fou : Gemini renvoie parfois du markdown ```json ... ```
    if output.startswith("```"):
        # On enlève les éventuels fences Markdown
        output = re.sub(r"^```[a-zA-Z]*", "", output)
        output = re.sub(r"```$", "", output).strip()

    match = re.search(r"\{.*\}", output, flags=re.DOTALL)
    if match:
        json_str = match.group(0)
    else:
        json_str = output

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Réparation basique
        json_str = re.sub(r"(?<!:)\/\/.*", "", json_str)
        json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
        json_str = re.sub(r"([\}\]])\s*(\"[^\"]+\"\s*:)", r"\1,\2", json_str)
        json_str = re.sub(r"([0-9]+|true|false|null)\s+(\"[^\"]+\"\s*:)", r"\1,\2", json_str)
        json_str = re.sub(r"(\")\s+(\"[^\"]+\"\s*:)", r"\1,\2", json_str)
        return json.loads(json_str)


# ============================================================================
# 3. APPEL GEMINI
# ============================================================================

def generate_with_gemini(prompt: str) -> str:
    """
    Envoie un prompt à Gemini et renvoie le texte généré.
    """
    response = _gemini_model.generate_content(prompt)
    # response.text contient généralement la réponse combinée
    return response.text.strip()


# ============================================================================
# 4. FONCTION PRINCIPALE : parse_job_offer_gemini
# ============================================================================

def parse_job_offer_gemini(offer_text: str) -> Dict[str, Any]:
    """
    Analyse une offre d'emploi en utilisant Gemini
    et renvoie un dictionnaire JSON structuré.
    """
    language = detect_language(offer_text)
    prompt = build_parsing_prompt(offer_text, language)
    raw_output = generate_with_gemini(prompt)
    parsed_json = extract_json_from_output(raw_output)

    print(parsed_json)
    return parsed_json


# ============================================================================
# 5. DEMO EN LIGNE DE COMMANDE
# ============================================================================

if __name__ == "__main__":
    demo_offer = """
    Data Scientist Junior (H/F) - Toulouse

    Airbus Defence and Space

    Vos missions :
    - Vous serez en charge d'analyser des données capteurs.
    - Vous développerez des modèles de machine learning en Python.
    - Vous contribuerez à l'amélioration des tableaux de bord (Power BI).

    Profil recherché :
    - Bac+5 en Data Science, Informatique ou équivalent.
    - Maîtrise de Python et SQL.
    - 1 à 2 ans d'expérience (stage ou alternance compris).
    - Esprit d'équipe, bonnes capacités de communication.
    """

    print("[INFO] Parsing de la démo avec Gemini...")
    result = parse_job_offer_gemini(demo_offer)
    print(json.dumps(result, indent=2, ensure_ascii=False))
