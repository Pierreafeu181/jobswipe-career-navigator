import pytest
import sys
import os
from unittest.mock import patch, mock_open, MagicMock

# Ajout du dossier parent au path pour importer les modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from functions.cv_generator import (
    html_escape,
    format_rich_text,
    generate_cv_html,
    convert_html_to_pdf
)

def test_html_escape():
    assert html_escape("foo & bar") == "foo &amp; bar"
    assert html_escape("<script>") == "&lt;script&gt;"
    assert html_escape('"quote"') == "&quot;quote&quot;"
    assert html_escape(None) == ""

def test_format_rich_text():
    # Test basic bold replacement
    assert format_rich_text("This is **bold**") == "This is <strong>bold</strong>"
    # Test with HTML escaping
    assert format_rich_text("Bold & **dangerous**") == "Bold &amp; <strong>dangerous</strong>"
    # Test multiple bold sections
    assert format_rich_text("**A** and **B**") == "<strong>A</strong> and <strong>B</strong>"

def test_generate_cv_html_structure():
    # Données factices pour le test
    full_cv_content = {
        "cv_title": {"cv_title": "Super Développeur"},
        "objective": {"objective": "Trouver un job super."},
        "experiences": [
            {
                "source_title": "Dev Junior",
                "company": "Tech Corp",
                "location": "Paris",
                "start_date": "2020",
                "end_date": "2021",
                "bullets": ["Code **propre**", "Tests unitaires"]
            }
        ],
        "projects": [],
        "education": [
            {
                "degree": "Master",
                "school": "Ecole",
                "location": "Lyon",
                "start_date": "2018",
                "end_date": "2020"
            }
        ],
        "skills": {
            "sections": [
                {"section_title": "Langages", "items": ["Python", "Rust"]}
            ]
        },
        "interests": []
    }
    
    contact_info = {
        "name": "Jean Dupont",
        "email": "jean@dupont.fr",
        "phone": "0600000000",
        "city": "Paris",
        "role": "Développeur",
        "github": "jdupont",
        "linkedin": "jdupont"
    }

    html = generate_cv_html(full_cv_content, contact_info)

    # Vérifications basiques de présence
    assert "<!DOCTYPE html>" in html
    assert "Jean Dupont" in html
    assert "Super Développeur" in html # Le titre du CV doit être utilisé comme rôle si présent
    assert "Trouver un job super" in html
    assert "Tech Corp" in html
    assert "<strong>propre</strong>" in html # Vérifie que le formatage riche fonctionne dans les bullets
    assert "Master" in html
    assert "Python" in html

@patch("functions.cv_generator.pisa")
def test_convert_html_to_pdf(mock_pisa):
    # Mock de la création du fichier pour ne pas écrire sur le disque
    with patch("builtins.open", mock_open()) as mock_file:
        output_path = "output.pdf"
        html_content = "<html><body>Test</body></html>"
        
        result = convert_html_to_pdf(html_content, output_path)
        
        assert result == output_path
        # Vérifie que pisa.CreatePDF a été appelé avec le bon contenu
        mock_pisa.CreatePDF.assert_called_once()
        args, kwargs = mock_pisa.CreatePDF.call_args
        assert args[0] == html_content
        assert "dest" in kwargs