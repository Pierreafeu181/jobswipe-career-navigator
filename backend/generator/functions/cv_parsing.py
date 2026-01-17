"""
cv_ai_parser.py

Parse a CV/resume using an LLM (Gemini) and return a structured dictionary.

- No PDF logic here: you pass a CV as raw text (string).
- Uses google-generativeai (Gemini) with a strict JSON schema.
- Output: Python dict (parsed from JSON returned by the model).

Env variables required:
    GEMINI_API_KEY      # your Gemini API key
Optional:
    GEMINI_MODEL_NAME   # override model name if needed
"""

from __future__ import annotations

import os
import json
import re
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# ============================================================================
# 1. CONFIG GEMINI
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME")

print("model name" , GEMINI_MODEL_NAME)
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

    # Gestion des blocs Markdown
    if "```" in output:
        output = re.sub(r"^```[a-zA-Z0-9]*\s*", "", output)
        output = re.sub(r"\s*```$", "", output)

    match = re.search(r"\{.*\}", output, flags=re.DOTALL)
    if match:
        json_str = match.group(0)
    else:
        json_str = output

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"[DEBUG] JSONDecodeError (first attempt): {e}")
        print(f"[DEBUG] Raw output was:\n{output}\n---")
        # Réparation basique
        # 0. Suppression des commentaires multi-lignes /* ... */
        json_str = re.sub(r"/\*.*?\*/", "", json_str, flags=re.DOTALL)
        # 1. Suppression des commentaires //
        json_str = re.sub(r"(?<!:)\/\/.*", "", json_str)
        # 2. Suppression des virgules traînantes
        json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
        # 3. Ajout des virgules manquantes entre accolades/crochets et clé suivante
        json_str = re.sub(r"([\}\]])\s*(\"[^\"]+\"\s*:)", r"\1,\2", json_str)
        # 4. Ajout des virgules manquantes après une valeur simple
        json_str = re.sub(r"([0-9]+|true|false|null)\s+(\"[^\"]+\"\s*:)", r"\1,\2", json_str)
        # 5. Ajout des virgules manquantes après une string
        json_str = re.sub(r"(\")\s+(\"[^\"]+\"\s*:)", r"\1,\2", json_str)
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e2:
            print(f"[ERROR] JSONDecodeError (after repair): {e2}")
            print(f"[ERROR] Failed JSON string:\n{json_str}\n---")
            print(f"[WARNING] Échec du parsing JSON du CV. Retour d'un profil partiel.")
            # Fallback pour éviter le crash 500
            return {"raw_summary": "Erreur de lecture automatique. Veuillez remplir votre profil manuellement."}


# ============================================================================
# 3. PROMPT DE PARSING DU CV
# ============================================================================

def build_cv_parsing_prompt(cv_text: str, current_profile: Optional[Dict[str, Any]] = None) -> str:
    """
    Build the prompt sent to Gemini to parse the CV into a structured JSON.
    The output will be in French.
    """
    context_instruction = ""
    if current_profile:
        profile_str = json.dumps(current_profile, ensure_ascii=False, indent=2)
        context_instruction = f"""
CONTEXT - EXISTING USER PROFILE:
The user already has a profile with the following data:
{profile_str}

TASK UPDATE:
- You must MERGE the information from the CV text below into this existing profile.
- KEEP existing information if it is not mentioned in the CV (do not delete existing experiences or skills).
- UPDATE fields if the CV provides newer or more detailed information.
- AVOID duplicates in lists (e.g. skills).
"""

    return f"""
You are an AI expert specialized in parsing CVs and resumes.

Your task:
Analyze the CV text below and extract structured information about the candidate.
{context_instruction}
You MUST return STRICTLY a valid JSON object, with NO explanation, NO text
before, and NO text after.

⚠️ VERY IMPORTANT — The JSON MUST contain ALL of the following fields,
with EXACTLY these names:

{{
  "first_name": string | null,          // Candidate first name
  "last_name": string | null,           // Candidate last name
  "full_name": string | null,           // Full name as it appears on the CV
  "target_role": string | null,         // Inferred target job title based on CV content
  "experience_level": string | null,    // e.g. "Junior", "Senior", "Expert", "Student"

  "contacts": {{
    "emails": string[],                 // all email addresses found
    "phones": string[],                 // all phone numbers found
    "locations": string[]               // cities / countries / locations
  }},

  "websites": [                         // personal sites, portfolios, blogs
    {{
      "label": string | null,           // e.g., "Portfolio", "Personal website"
      "url": string
    }}
  ],

  "social_links": [                     // LinkedIn, GitHub, etc.
    {{
      "platform": string | null,        // e.g., "LinkedIn", "GitHub"
      "url": string
    }}
  ],

  "skills": {{
    "hard_skills": string[],            // technical / domain skills
    "soft_skills": string[],            // interpersonal / behavioral
    "languages": [                      // spoken languages
      {{
        "name": string,                 // e.g. "French"
        "level": string | null          // e.g. "Native", "C1", "Fluent"
      }}
    ]
  }},

  "professional_experiences": [         // jobs, internships, freelance
    {{
      "title": string | null,           // job title
      "company": string | null,         // employer
      "location": string | null,        // city / country if available
      "start_date": string | null,      // as written in the CV (e.g., "Feb 2024", "2022")
      "end_date": string | null,        // "Present" or similar if ongoing
      "description": string             // short paragraph or bullet list joined
    }}
  ],

  "academic_projects": [                // student projects, hackathons, etc.
    {{
      "title": string | null,
      "context": string | null,         // e.g., course, hackathon, team project
      "technologies": string[],         // stack: e.g., ["Python", "D3.js"]
      "description": string
    }}
  ],

  "education": [                        // degrees, schools, universities
    {{
      "degree": string | null,          // e.g., "Diplôme d'ingénieur en Data Science"
      "school": string | null,          // e.g., "IMT Atlantique"
      "location": string | null,        // city / country if available
      "start_date": string | null,      // as written in the CV
      "end_date": string | null,        // as written in the CV
      "description": string             // e.g., main courses, specializations
    }}
  ],

  "certifications": [                   // certifications, MOOCs, badges
    {{
      "name": string | null,            // e.g., "AWS Certified Cloud Practitioner"
      "issuer": string | null,          // e.g., "Amazon", "Coursera"
      "date": string | null             // as written in the CV
    }}
  ],

  "interests": [                        // hobbies, extracurriculars
    string
  ],

  "raw_summary": string | null          // short global summary of the candidate (2–3 sentences)
}}

Rules you MUST follow:
- All string values in the JSON output MUST be in French. This includes descriptions, titles, summaries, etc.
- Return ONLY the JSON object — no markdown, no backticks, no comments.
- If a field is unknown, set it to null (for scalars) or [] (for lists).
- Always include all top-level keys (even if empty).
- Do NOT invent projects or companies that are not clearly in the CV.
- You may slightly rephrase descriptions to make them concise and clear.
- Dates must remain as written in the CV (no need to normalize format).

Here is the CV text to parse:
\"\"\" 
{cv_text}
\"\"\"
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
            temperature=0.1,
            max_output_tokens=8192,
        ),
    )
    # Selon la version de la lib, le texte peut être accessible via .text ou parts
    try:
        return response.text
    except AttributeError:
        # fallback: concat all text parts
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


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """
    Extrait le texte brut depuis un fichier binaire (PDF, DOCX) ou texte.
    """
    filename = filename.lower()
    text = ""

    if filename.endswith(".pdf"):
        try:
            import io
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_content))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except ImportError:
            raise ImportError("La librairie 'pypdf' est manquante. Installez-la avec : pip install pypdf")
        except Exception as e:
            raise ValueError(f"Erreur lors de la lecture du PDF : {e}")

    elif filename.endswith(".docx"):
        try:
            import io
            from docx import Document
            doc = Document(io.BytesIO(file_content))
            text = "\n".join([p.text for p in doc.paragraphs])
        except ImportError:
            raise ImportError("La librairie 'python-docx' est manquante. Installez-la avec : pip install python-docx")
        except Exception as e:
            raise ValueError(f"Erreur lors de la lecture du DOCX : {e}")

    else:
        # Tentative de lecture en texte brut
        text = file_content.decode("utf-8", errors="ignore")

    return text


def parse_cv_with_gemini(cv_text: str, current_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    High-level function: takes raw CV text, sends it to Gemini,
    parses the JSON, and returns a Python dict.
    """
    prompt = build_cv_parsing_prompt(cv_text, current_profile)
    raw_output = generate_with_gemini(prompt)
    parsed_json = extract_json_from_output(raw_output)
    return parsed_json


# ============================================================================
# 5. DEMO EN LIGNE DE COMMANDE (OPTIONNEL)
# ============================================================================

if __name__ == "__main__":
    demo_cv = """
    THEAU AGUET
    Data Scientist & Entrepreneur - Bridging AI, Product & Strategy
    France
    Phone: +33 7 82 01 83 97
    Email: theauaguetpro@gmail.com
    LinkedIn: https://www.linkedin.com/in/theauaguet
    GitHub: https://github.com/the0eau
    Portfolio: https://the0eau.github.io/portfolio/

    EXPERIENCE PROFESSIONNELLE
    Data Scientist Intern - Airbus, Toulouse, France
    Feb 2024 - Aug 2024
    - Built predictive maintenance models on sensor data (Python, scikit-learn).
    - Improved failure detection by ~7% on 50k+ records.
    - Automated dashboards for 3 stakeholders in the engineering team.

    PROJETS ACADÉMIQUES
    Glycemic Variability Dashboard – D3.js & Wearables
    - Built an interactive visualization of glucose and activity data.
    - Combined 7 datasets (Dexcom, ACC, HR, etc.) with Python and Pandas.

    FORMATION
    IMT Atlantique – Diplôme d'ingénieur en Data Science
    2022 – 2025

    CERTIFICATIONS
    DeepLearning.AI TensorFlow Developer – Coursera, 2023

    COMPÉTENCES
    Python, SQL, Machine Learning, D3.js, Data Visualization, Git, Docker

    CENTRES D'INTÉRÊT
    Running (half-marathons), Chess, Entrepreneurship, Teaching.
    """

    print("[INFO] Parsing CV with Gemini...")
    result = parse_cv_with_gemini(demo_cv)
    print(json.dumps(result, indent=2, ensure_ascii=False))
