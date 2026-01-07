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
from typing import Dict, Any

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ============================================================================
# 1. CONFIG GEMINI
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

genai.configure(api_key=GEMINI_API_KEY)
print("model name" , GEMINI_MODEL_NAME)
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
    except json.JSONDecodeError:
        # Réparation basique
        json_str = re.sub(r"(?<!:)\/\/.*", "", json_str)
        json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
        return json.loads(json_str)


# ============================================================================
# 3. PROMPT DE PARSING DU CV
# ============================================================================

def build_cv_parsing_prompt(cv_text: str) -> str:
    """
    Build the prompt sent to Gemini to parse the CV into a structured JSON.

    Prompt en anglais pour limiter les ambiguïtés.
    """
    return f"""
You are an AI expert specialized in parsing CVs and resumes.

Your task:
Analyze the CV text below and extract structured information about the candidate.
You MUST return STRICTLY a valid JSON object, with NO explanation, NO text
before, and NO text after.

⚠️ VERY IMPORTANT — The JSON MUST contain ALL of the following fields,
with EXACTLY these names:

{{
  "first_name": string | null,          // Candidate first name
  "last_name": string | null,           // Candidate last name
  "full_name": string | null,           // Full name as it appears on the CV

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
    "languages": string[]               // spoken languages (e.g., "French (C1)")
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
    response = _gemini_model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=2048,
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


def parse_cv_with_gemini(cv_text: str) -> Dict[str, Any]:
    """
    High-level function: takes raw CV text, sends it to Gemini,
    parses the JSON, and returns a Python dict.
    """
    prompt = build_cv_parsing_prompt(cv_text)
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
