from __future__ import annotations

from typing import Dict, Any, List, Optional
import os
import re
from pyhere import here

try:
    from xhtml2pdf import pisa
except ImportError:
    raise ImportError("La librairie 'xhtml2pdf' est manquante. Veuillez l'installer via la commande : pip install xhtml2pdf")

# ===========================
#  HTML Helpers
# ===========================

def html_escape(text: str) -> str:
    """
    Escape HTML special chars in user-provided text.
    """
    if text is None:
        return ""
    replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }
    return "".join(replacements.get(c, c) for c in text)

def format_rich_text(text: str) -> str:
    """
    Escape HTML special chars then convert **bold** to <strong>bold</strong>.
    """
    safe_text = html_escape(text)
    return re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", safe_text)

# ===========================
#  HTML Section Renderers
# ===========================

def _render_html_head_and_header(contact_info: Dict[str, str], role: str) -> str:
    # Using the CSS from src/pages/CV.css directly embedded
    # ADAPTATION POUR XHTML2PDF : Pas de Flexbox, utilisation de Tables.
    css_styles = """
    @page {
        size: a4 portrait;
        margin: 1.27cm; /* 0.5in */
        margin-bottom: 2.54cm; /* 1in */
    }

    body {
        font-family: Helvetica, sans-serif;
        color: #333;
        background-color: #fff;
        font-size: 10pt;
    }
    
    p {
        margin-top: 0;
        margin-bottom: 3px;
    }

    /* Layout via Tables car Flexbox non supporté par xhtml2pdf */
    table {
        width: 100%;
        border-collapse: collapse;
    }
    td {
        vertical-align: top;
    }

    .header-table td {
        border-bottom: 2px solid rgb(61, 90, 128);
        padding-bottom: 5px;
    }

    h1 {
        font-size: 24pt;
        margin: 0;
        font-weight: bold;
    }

    .role {
        color: rgb(61, 90, 128);
        font-size: 12pt;
        font-weight: bold;
    }

    a {
        color: rgb(61, 90, 128);
        text-decoration: none;
    }

    .cv-section {
        margin-bottom: 8px;
    }

    .cv-section h2 {
        color: rgb(61, 90, 128);
        text-transform: uppercase;
        font-size: 12pt;
        border-bottom: 1px solid rgb(61, 90, 128);
        padding-bottom: 0px;
        margin-top: 10px; /* ~0.5em */
        margin-bottom: 2px;
    }

    .cv-subsection {
        margin-bottom: 5px;
    }

    .subsection-title {
        font-weight: bold;
        font-size: 10pt;
    }

    .subsection-dates {
        color: #000;
        text-align: right;
    }

    .subsection-subheader td {
        font-style: italic;
        color: #000;
    }

    .cv-section ul {
        margin-left: 15px;
        padding-left: 0;
        margin-top: 0px;
        margin-bottom: 0px;
    }

    .cv-section li {
        margin-bottom: 0px;
        line-height: 1.3;
    }
    """
    
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html_escape(contact_info['name'])} - CV</title>
    <style>{css_styles}</style>
</head>
<body>
    <div class="cv-container">
        <table class="header-table">
            <tr>
                <td width="30%" style="text-align: left;">
                    Email: <a href="mailto:{html_escape(contact_info['email'])}">{html_escape(contact_info['email'])}</a><br />
                    Mobile: {html_escape(contact_info['phone'])}<br />
                    {html_escape(contact_info['city'])}
                </td>
                <td width="40%" style="text-align: center;">
                    <h1>{format_rich_text(contact_info['name'])}</h1>
                    <div class="role">{format_rich_text(role)}</div>
                </td>
                <td width="30%" style="text-align: right;">
                    Site web portfolio: <a href="https://the0eau.github.io/portfolio/">link</a><br />
                    Github: <a href="https://github.com/{html_escape(contact_info['github'])}">link</a><br />
                    Linkedin: <a href="https://www.linkedin.com/in/{html_escape(contact_info['linkedin'])}">link</a>
                </td>
            </tr>
        </table>
        <div class="cv-main">
"""

def _render_html_objective(objective: str) -> str:
    if not objective:
        return ""
    return f"""
            <section class="cv-section">
                <h2>Objectif</h2>
                <p>{format_rich_text(objective)}</p>
            </section>
"""

def _render_html_experiences(experiences: List[Dict[str, Any]]) -> str:
    if not experiences:
        return ""
    html_blocks = []
    for exp in experiences:
        title = format_rich_text(exp.get("target_title") or exp.get("source_title", ""))
        company = format_rich_text(exp.get("company", ""))
        location = format_rich_text(exp.get("location", ""))
        start_date = html_escape(exp.get("start_date", ""))
        end_date = html_escape(exp.get("end_date", ""))
        bullets = exp.get("bullets", [])

        date_str = ""
        if start_date and end_date:
            date_str = f"{start_date} -- {end_date}"
        elif start_date:
            date_str = start_date
        elif end_date:
            date_str = end_date

        bullet_html = "".join([f"<li>{format_rich_text(b.strip())}</li>" for b in bullets if b.strip()])

        html_blocks.append(f"""
            <div class="cv-subsection">
                <!-- Title & Date Row -->
                <table width="100%">
                    <tr>
                        <td class="subsection-title">{title}</td>
                        <td class="subsection-dates" align="right">{date_str}</td>
                    </tr>
                    <!-- Company & Location Row -->
                    <tr class="subsection-subheader">
                        <td><em>{company}</em></td>
                        <td align="right"><em>{location}</em></td>
                    </tr>
                </table>
                <ul>{bullet_html}</ul>
            </div>
        """)
    return f"""
            <section class="cv-section">
                <h2>Expérience professionnelle</h2>
                {''.join(html_blocks)}
            </section>
"""

def _render_html_projects(projects: List[Dict[str, Any]]) -> str:
    if not projects:
        return ""
    html_blocks = []
    for proj in projects:
        title = format_rich_text(proj.get("target_title") or proj.get("source_title", ""))
        tech_stack = ", ".join([format_rich_text(t) for t in proj.get("tech_stack", [])])
        bullets = proj.get("bullets", [])

        bullet_html = "".join([f"<li>{format_rich_text(b.strip())}</li>" for b in bullets if b.strip()])

        html_blocks.append(f"""
            <div class="cv-subsection">
                <table width="100%">
                    <tr>
                        <td class="subsection-title">{title}</td>
                    </tr>
                </table>
                <div><em>{tech_stack}</em></div>
                <ul>{bullet_html}</ul>
            </div>
        """)
    return f"""
            <section class="cv-section">
                <h2>Expérience en matière de leadership</h2>
                {''.join(html_blocks)}
            </section>
"""

def _render_html_education(education_list: List[Dict[str, Any]]) -> str:
    if not education_list:
        return ""
    html_blocks = []
    for edu in education_list:
        degree = format_rich_text(edu.get("degree", ""))
        school = format_rich_text(edu.get("school", ""))
        location = format_rich_text(edu.get("location", ""))
        start_date = html_escape(edu.get("start_date", ""))
        end_date = html_escape(edu.get("end_date", ""))
        bullets = edu.get("bullets", [])

        date_str = ""
        if start_date and end_date:
            date_str = f"{start_date} -- {end_date}"
        elif start_date:
            date_str = start_date
        elif end_date:
            date_str = end_date

        details_html = ""
        if bullets:
            details_html = f"<p>{format_rich_text(' '.join([b.strip() for b in bullets if b.strip()]))}</p>"

        main_text_parts = [school]
        if degree:
            main_text_parts.append(degree)
        if location:
            main_text_parts.append(location)
        main_text = ", ".join(p for p in main_text_parts if p)

        html_blocks.append(f"""
            <table width="100%" style="margin-bottom: 2px;">
                <tr>
                    <td><strong>{main_text}</strong></td>
                    <td align="right">{date_str}</td>
                </tr>
            </table>
            {details_html}
        """)
    return f"""
            <section class="cv-section">
                <h2>Formation</h2>
                {''.join(html_blocks)}
            </section>
"""

def _render_html_activities(interests: List[Dict[str, Any]]) -> str:
    if not interests:
        return ""
    html_blocks = []
    for it in interests:
        label = format_rich_text(it.get("label", ""))
        sentence = format_rich_text(it.get("sentence", ""))
        if label or sentence:
            html_blocks.append(f"""
            <table width="100%" style="margin-bottom: 2px;">
                <tr><td width="30%"><strong>{label}</strong></td>
                <td>{sentence}</td></tr>
            </table>
        """)
    return f"""
            <section class="cv-section">
                <h2>Activités</h2>
                {''.join(html_blocks)}
            </section>
"""

def _render_html_skills(skills: Dict[str, Any]) -> str:
    sections = skills.get("sections") or []
    if not sections:
        return ""
    html_blocks = []
    for section in sections:
        title = format_rich_text(section.get("section_title", ""))
        items = section.get("items", [])
        items_html = ", ".join([format_rich_text(i) for i in items if i])
        if title and items_html:
            html_blocks.append(f"""
            <p>
                <strong>{title}</strong> - {items_html}.
            </p>
        """)
    return f"""
            <section class="cv-section">
                <h2>Compétences</h2>
                {''.join(html_blocks)}
            </section>
"""

def generate_cv_html(
    full_cv_content: Dict[str, Any],
    contact_info: Dict[str, str],
) -> str:
    """
    Consume `full_cv_content` and `contact_info` and return a full HTML CV string.
    """
    # Determine CV title / role
    cv_title = ""
    if "cv_title" in full_cv_content and isinstance(full_cv_content["cv_title"], dict):
        cv_title = full_cv_content["cv_title"].get("cv_title", "") or ""
    role_to_use = cv_title or contact_info["role"]

    html_parts = []
    html_parts.append(_render_html_head_and_header(contact_info, role_to_use))
    
    html_parts.append(_render_html_objective(
        full_cv_content.get("objective", {}).get("objective", "")
    ))
    html_parts.append(_render_html_experiences(
        full_cv_content.get("experiences", {}).get("experiences", [])
    ))
    html_parts.append(_render_html_projects(
        full_cv_content.get("projects", {}).get("projects", [])
    ))
    html_parts.append(_render_html_education(
        full_cv_content.get("education", {}).get("education", [])
    ))
    html_parts.append(_render_html_skills(
        full_cv_content.get("skills", {}).get("skills", {})
    ))
    html_parts.append(_render_html_activities(
        full_cv_content.get("interests", {}).get("interests", []) # Using interests from JSON as per original latex logic
    ))

    html_parts.append("""
        </div>
    </div>
</body>
</html>
""")
    return "".join(html_parts)


def convert_html_to_pdf(html_content: str, output_path: str) -> str:
    """
    Convert an HTML string to a PDF file using xhtml2pdf (Pure Python).

    Args:
        html_content: The full HTML content as a string.
        output_path: The absolute path where the PDF will be saved.

    Returns:
        The absolute path to the generated PDF.
    """
    with open(output_path, "wb") as result_file:
        pisa_status = pisa.CreatePDF(html_content, dest=result_file)
    return output_path


if __name__ == "__main__":
    # Exemple minimal factice pour tester la génération de fichiers
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

    print("[INFO] Génération du CV HTML à partir de dummy_full_cv...")
    html_cv_content = generate_cv_html(dummy_full_cv, dummy_contact)
    html_output_path = here("backend/generator/cv/resume.html")
    with open(html_output_path, "w", encoding="utf-8") as f:
        f.write(html_cv_content)
    print(f"CV HTML généré à l’emplacement : {html_output_path}")

    # Compilation du CV HTML en PDF
    html_pdf_path = here("backend/generator/cv/resume_html.pdf")
    convert_html_to_pdf(html_cv_content, html_pdf_path)
    print(f"CV HTML converti en PDF à l’emplacement : {html_pdf_path}")
    print("[INFO] Terminé.")