"""
cover_letter_gemini_docx_generator.py

Generate a FRENCH cover letter (lettre de motivation) as a DOCX,
personalized by Gemini, then convert it to PDF.

Inputs:
- offer_parsed: output of parse_job_offer_gemini(offer_text)
- cv_parsed:    output of parse_cv_with_gemini(cv_text)

Gemini:
- Generates the letter text in French, following a structure similar to:

  Prénom et Nom
  Adresse
  Mail et numéro de téléphone

  Contact dans l’entreprise (si vous l’avez)
  Nom de l’entreprise
  Adresse

  Fait à [Ville], le [Date]
  Objet : Candidature pour le poste de [Nom du poste] - [Référence]
  Madame, Monsieur,
  [Paragraphe 1]
  [Paragraphe 2]
  [Paragraphe 3]
  [Paragraphe 4]
  [Nom et Prénom]

Dependencies:
    pip install google-generativeai python-docx docx2pdf
"""

from __future__ import annotations

from typing import Dict, Any, Optional
import os
import json
import re
import datetime

from dotenv import load_dotenv
import google.generativeai as genai
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx2pdf import convert
from pyhere import here

load_dotenv()

# ============================================================================
# 1. CONFIG GEMINI
# ============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")

genai.configure(api_key=GEMINI_API_KEY)
_gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)


# ============================================================================
# 2. Helpers (dates / normalisation / JSON)
# ============================================================================

def normalize_str(s: Optional[str]) -> str:
    if not s:
        return ""
    return " ".join(s.split())


def french_date(today: Optional[datetime.date] = None) -> str:
    if today is None:
        today = datetime.date.today()
    months = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ]
    return f"{today.day} {months[today.month - 1]} {today.year}"


def extract_json_from_output(output: str) -> Dict[str, Any]:
    """
    Extract a JSON object from the model's raw text output.

    - If the output is already pure JSON, parse directly.
    - Otherwise, find the first {...} block.
    """
    output = output.strip()

    if output.startswith("{") and output.endswith("}"):
        return json.loads(output)

    match = re.search(r"\{.*\}", output, flags=re.DOTALL)
    if not match:
        raise ValueError(
            "Impossible de trouver un objet JSON dans la sortie de Gemini. "
            f"Sortie brute (début) : {output[:200]!r}"
        )

    json_str = match.group(0)
    return json.loads(json_str)


# ============================================================================
# 3. Extraction minimale des infos de contact pour aider Gemini
# ============================================================================

def pick_contact_info(cv_parsed: Dict[str, Any]) -> Dict[str, str]:
    first_name = normalize_str(cv_parsed.get("first_name"))
    last_name = normalize_str(cv_parsed.get("last_name"))
    full_name = normalize_str(cv_parsed.get("full_name"))

    if not full_name and (first_name or last_name):
        full_name = (first_name + " " + last_name).strip()

    contacts = cv_parsed.get("contacts") or {}
    emails = contacts.get("emails") or []
    phones = contacts.get("phones") or []
    locations = contacts.get("locations") or []

    email = emails[0] if emails else ""
    phone = phones[0] if phones else ""
    city = locations[0] if locations else ""

    return {
        "first_name": first_name,
        "last_name": last_name,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "city": city,
    }


# ============================================================================
# 4. Prompt Gemini pour générer la lettre
# ============================================================================
def build_cover_letter_prompt(
    offer_parsed: Dict[str, Any],
    cv_parsed: Dict[str, Any],
    gender: str = "M",
    reference: Optional[str] = None,
    city_override: Optional[str] = None,
    date_override: Optional[str] = None,
) -> str:

    offer_json = json.dumps(offer_parsed, ensure_ascii=False, indent=2)
    cv_json = json.dumps(cv_parsed, ensure_ascii=False, indent=2)
    contact = pick_contact_info(cv_parsed)

    city_hint = city_override or contact["city"] or ""
    date_hint = date_override or french_date()
    full_name = contact["full_name"]
    gender_label = "masculin" if gender.upper() == "M" else "féminin"

    return f"""
You are an expert French cover letter writer.

Goal:
Write a highly personalized and professional French cover letter,
TARGETING the given job offer.

!!! IMPORTANT STRUCTURAL RULES !!!
- The greeting “Madame, Monsieur” MUST be placed in a SEPARATE JSON FIELD called "greeting".
- "para1" MUST NOT contain “Madame, Monsieur”.
  Example:
    "greeting": "Madame, Monsieur",
    "para1": "Je vous écris afin d’exprimer ma motivation..."

You MUST return STRICTLY a JSON with EXACTLY the fields below:

{{
  "header_blocks": {{
    "fullname_block": string,
    "location_block": string,
    "email_block": string,
    "phone_block": string,
    "websites_block": string
  }},
  "company_blocks": {{
    "contact_block": string,
    "company_name_block": string,
    "company_address_block": string
  }},
  "place_date_line": string,
  "objet_line": string,
  "greeting": string,               // MUST be only “Madame, Monsieur”
  "para1": string,                  // NO greeting here
  "para2": string,
  "para3": string,
  "para4": string,
  "signature": string
}}

Guidelines:
- Entire letter MUST be in French.
- Personalize and adapt to the missions, technologies, skills and requirements of the offer.
- Use the candidate's real information from the CV JSON.
- The candidate's gender is {gender_label} → adapt adjectives (motivé(e), intéressé(e), etc.).
- STRICT FIDELITY: Do NOT invent any experience, skill, or fact about the candidate. Use ONLY what is in the "CANDIDATE PROFILE" JSON. If the candidate lacks a specific skill required by the offer, do NOT claim they have it.

Hints:
- Suggested city: {city_hint}
- Suggested date: {date_hint}
- Suggested reference: {reference if reference else "none"}
  
====================
JOB OFFER (parsed JSON)
====================
{offer_json}

====================
CANDIDATE PROFILE (parsed CV JSON)
====================
{cv_json}

Return ONLY the JSON object — no markdown, no comments, no explanation.
"""



def generate_letter_structure_with_gemini(
    offer_parsed: Dict[str, Any],
    cv_parsed: Dict[str, Any],
    gender: str = "M",
    reference: Optional[str] = None,
    city_override: Optional[str] = None,
    date_override: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Appelle Gemini pour obtenir une lettre structurée avec le schéma :

    {
      "header_blocks": {
        "fullname_block": ...,
        "location_block": ...,
        "email_block": ...,
        "phone_block": ...,
        "websites_block": ...
      },
      "company_blocks": {
        "contact_block": ...,
        "company_name_block": ...,
        "company_address_block": ...
      },
      "place_date_line": ...,
      "objet_line": ...,
      "greeting": ...,      # ex: "Madame, Monsieur"
      "para1": ...,
      "para2": ...,
      "para3": ...,
      "para4": ...,
      "signature": ...
    }
    """
    prompt = build_cover_letter_prompt(
        offer_parsed=offer_parsed,
        cv_parsed=cv_parsed,
        gender=gender,
        reference=reference,
        city_override=city_override,
        date_override=date_override,
    )

    response = _gemini_model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.5,
            max_output_tokens=2048,
        ),
    )

    # Récupération du texte brut
    try:
        raw_text = response.text
    except AttributeError:
        if hasattr(response, "candidates") and response.candidates:
            parts = []
            for cand in response.candidates:
                if not cand.content:
                    continue
                for p in cand.content.parts:
                    if getattr(p, "text", None):
                        parts.append(p.text)
            raw_text = "\n".join(parts)
        else:
            raise RuntimeError(f"Réponse Gemini inattendue : {response!r}")

    letter_json = extract_json_from_output(raw_text)

    # Helpers pour sécuriser les champs
    def norm(s: Any) -> str:
        if not isinstance(s, str):
            s = "" if s is None else str(s)
        return normalize_str(s)

    header_blocks_raw = letter_json.get("header_blocks") or {}
    company_blocks_raw = letter_json.get("company_blocks") or {}

    header_blocks = {
        "fullname_block": norm(header_blocks_raw.get("fullname_block", "")),
        "location_block": norm(header_blocks_raw.get("location_block", "")),
        "email_block": norm(header_blocks_raw.get("email_block", "")),
        "phone_block": norm(header_blocks_raw.get("phone_block", "")),
        "websites_block": norm(header_blocks_raw.get("websites_block", "")),
    }

    company_blocks = {
        "contact_block": norm(company_blocks_raw.get("contact_block", "")),
        "company_name_block": norm(company_blocks_raw.get("company_name_block", "")),
        "company_address_block": norm(company_blocks_raw.get("company_address_block", "")),
    }

    return {
        "header_blocks": header_blocks,
        "company_blocks": company_blocks,
        "place_date_line": norm(letter_json.get("place_date_line", "")),
        "objet_line": norm(letter_json.get("objet_line", "")),
        "greeting": norm(letter_json.get("greeting", "")),
        "para1": norm(letter_json.get("para1", "")),
        "para2": norm(letter_json.get("para2", "")),
        "para3": norm(letter_json.get("para3", "")),
        "para4": norm(letter_json.get("para4", "")),
        "signature": norm(letter_json.get("signature", "")),
    }


# ============================================================================
# 5. Génération DOCX à partir de la structure (sans logique métier)
# ============================================================================
def build_cover_letter_docx_from_chunks(
    chunks: Dict[str, str],
    output_path: str,
) -> str:
    """
    Écrit un DOCX de lettre de motivation à partir des chunks générés par Gemini.
    Version avec espaces réduits entre les blocs.
    """
    doc = Document()

    # Style global
    style = doc.styles["Normal"]
    font = style.font
    font.name = "Calibri"
    font.size = Pt(11)

    # ==========================
    # HEADER CANDIDAT — plusieurs blocs alignés à gauche
    # ==========================
    header = chunks.get("header_blocks", {}) or {}

    def safe_block(val: str) -> Optional[str]:
        val = (val or "").strip()
        return val if val else None

    for key in ["fullname_block", "location_block", "email_block", "phone_block", "websites_block"]:
        line = safe_block(header.get(key))
        if not line:
            continue
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(line)
        if key == "fullname_block":
            run.bold = True

    # ==========================
    # COMPANY BLOCK — aligné à droite, blocs séparés
    # ==========================
    company = chunks.get("company_blocks", {}) or {}

    for key in ["contact_block", "company_name_block", "company_address_block"]:
        line = safe_block(company.get(key))
        if not line:
            continue
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.add_run(line)

    # ==========================
    # LIEU + DATE
    # ==========================
    place_date = safe_block(chunks.get("place_date_line"))
    if place_date:
        pd = doc.add_paragraph(place_date)
        pd.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    # ==========================
    # OBJET (gras)
    # ==========================
    objet_line = safe_block(chunks.get("objet_line"))
    if objet_line:
        p = doc.add_paragraph()
        run = p.add_run(objet_line)
        run.bold = True

    # ==========================
    # SALUTATION (greeting) avant para1
    # ==========================
    greet = safe_block(chunks.get("greeting"))
    if greet:
        doc.add_paragraph(greet)

    # pas de ligne blanche supplémentaire (demande utilisateur)
    # directement les paragraphes

    # ==========================
    # PARAGRAPHES 1 à 4
    # ==========================
    for key in ["para1", "para2", "para3", "para4"]:
        txt = safe_block(chunks.get(key))
        if txt:
            doc.add_paragraph(txt)

    # ==========================
    # SIGNATURE
    # ==========================
    signature = safe_block(chunks.get("signature"))
    if signature:
        doc.add_paragraph(signature)

    # Sauvegarde
    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    doc.save(output_path)

    return output_path



# ============================================================================
# 6. Conversion DOCX -> PDF
# ============================================================================

def convert_docx_to_pdf(docx_path: str, pdf_path: Optional[str] = None) -> str:
    """
    Convertit un .docx en .pdf via docx2pdf.
    """
    docx_path = os.path.abspath(docx_path)
    if pdf_path is None:
        base, _ = os.path.splitext(docx_path)
        pdf_path = base + ".pdf"
    else:
        pdf_path = os.path.abspath(pdf_path)

    os.makedirs(os.path.dirname(pdf_path) or ".", exist_ok=True)

    convert(docx_path, pdf_path)
    return pdf_path


# ============================================================================
# 7. Fonction high-level : Gemini + DOCX + PDF
# ============================================================================

def generate_personalized_cover_letter_docx_and_pdf(
    offer_parsed: Dict[str, Any],
    cv_parsed: Dict[str, Any],
    output_dir: str = ".",
    docx_filename: str = "lettre_motivation_gemini.docx",
    pdf_filename: Optional[str] = None,
    gender: str = "M",
    reference: Optional[str] = None,
    city_override: Optional[str] = None,
    date_override: Optional[str] = None,
) -> Dict[str, str]:
    """
    Pipeline complet :
      1. Gemini génère une lettre structurée (JSON).
      2. On construit le DOCX.
      3. On convertit en PDF.

    Retourne:
      {
        "docx_path": "...",
        "pdf_path": "..."
      }
    """
    os.makedirs(output_dir, exist_ok=True)
    docx_path = os.path.join(output_dir, docx_filename)

    # 1) Génération des chunks via Gemini
    chunks = generate_letter_structure_with_gemini(
        offer_parsed=offer_parsed,
        cv_parsed=cv_parsed,
        gender=gender,
        reference=reference,
        city_override=city_override,
        date_override=date_override,
    )

    # 2) Génération du DOCX
    docx_path = build_cover_letter_docx_from_chunks(chunks, output_path=docx_path)

    # 3) Conversion en PDF
    if pdf_filename is None:
        base, _ = os.path.splitext(docx_filename)
        pdf_filename = base + ".pdf"
    pdf_path = os.path.join(output_dir, pdf_filename)
    pdf_path = convert_docx_to_pdf(docx_path, pdf_path=pdf_path)

    return {
        "docx_path": docx_path,
        "pdf_path": pdf_path,
    }


# ============================================================================
# 8. Démo rapide
# ============================================================================

if __name__ == "__main__":
    # Mini exemples fake, juste pour tester la structure.
    offer_demo = {
        "title": "Data Scientist Junior",
        "company_name": "Airbus",
        "location": "Toulouse",
        "contract_type": "CDI",
        "seniority_level": "Junior",
        "Education": ["Diplôme d'ingénieur en Data Science"],
        "hard_skills": ["Python", "SQL", "Machine Learning"],
        "soft_skills": ["travail en équipe", "communication"],
        "missions": [
            "Développer des modèles de machine learning en Python.",
            "Collaborer avec les équipes d'ingénierie."
        ],
        "requirements": [
            "1–2 ans d'expérience en data science (stages inclus)."
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
        "skills": {
            "hard_skills": ["Python", "SQL", "Pandas", "Machine Learning"],
            "soft_skills": ["Travail en équipe", "Communication"],
            "languages": ["Français (C1)", "Anglais (C1)"]
        },
        "professional_experiences": [
            {
                "title": "Data Scientist Intern",
                "company": "Airbus",
                "location": "Toulouse",
                "start_date": "Feb 2024",
                "end_date": "Aug 2024",
                "description": "Travail sur des modèles de maintenance prédictive."
            }
        ],
        "education": [
            {
                "degree": "Diplôme d'ingénieur en Data Science",
                "school": "IMT Atlantique",
                "location": "France",
                "start_date": "2022",
                "end_date": "2025",
                "description": "Spécialisation en machine learning, statistiques et data engineering."
            }
        ],
    }

    print("[INFO] Génération de la lettre de motivation personnalisée (Gemini) en DOCX + PDF...")
    paths = generate_personalized_cover_letter_docx_and_pdf(
        offer_parsed=offer_demo,
        cv_parsed=cv_demo,
        output_dir=here("backend/generator/cover_letter"),
        docx_filename="lettre_motivation_gemini_demo.docx",
        gender="M",
        reference=None,
    )
    print("DOCX:", paths["docx_path"])
    print("PDF :", paths["pdf_path"])
