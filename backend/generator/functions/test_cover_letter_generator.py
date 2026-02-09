import pytest
import sys
import os
import json
from unittest.mock import patch, MagicMock

# Ajout du dossier parent au path pour importer les modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from functions.cover_letter_generator import (
    normalize_str,
    french_date,
    extract_json_from_output,
    pick_contact_info,
    generate_letter_structure_with_gemini,
    build_cover_letter_html_from_chunks,
    generate_personalized_cover_letter_docx_and_pdf,
)

# --- Test Helpers ---

def test_normalize_str():
    assert normalize_str("  hello \n world  ") == "hello world"
    assert normalize_str(None) == ""
    assert normalize_str("already clean") == "already clean"

def test_french_date():
    import datetime
    test_date = datetime.date(2024, 7, 26)
    assert french_date(test_date) == "26 juillet 2024"

def test_extract_json_from_output_robust():
    # Test avec markdown et virgules traînantes
    raw = '```json\n{"key": "value", "list": [1,],}\n```'
    data = extract_json_from_output(raw)
    assert data["key"] == "value"
    assert data["list"] == [1]

# --- Test Logic Functions ---

def test_pick_contact_info():
    cv_parsed = {
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "Johnathan Doe",
        "contacts": {
            "emails": ["john.doe@email.com", "secondary@email.com"],
            "phones": ["+123456789"],
            "locations": ["Paris"]
        }
    }
    contact_info = pick_contact_info(cv_parsed)
    assert contact_info["full_name"] == "Johnathan Doe"
    assert contact_info["email"] == "john.doe@email.com"
    assert contact_info["phone"] == "+123456789"
    assert contact_info["city"] == "Paris"

def test_pick_contact_info_minimal():
    cv_parsed = {
        "first_name": "Jane",
        "last_name": "Doe",
    }
    contact_info = pick_contact_info(cv_parsed)
    assert contact_info["full_name"] == "Jane Doe"
    assert contact_info["email"] == ""
    assert contact_info["phone"] == ""
    assert contact_info["city"] == ""

@patch('functions.cover_letter_generator._client')
def test_generate_letter_structure_with_gemini(mock_client):
    # Mock de l'objet réponse du client Gemini
    mock_response_header = MagicMock()
    mock_response_header.text = json.dumps({
        "header_blocks": {"fullname_block": "Test User"},
        "company_blocks": {"company_name_block": "Test Corp"},
        "place_date_line": "Fait à Paris, le 26 juillet 2024",
        "objet_line": "Objet: Test"
    })

    mock_response_body = MagicMock()
    mock_response_body.text = json.dumps({
        "greeting": "Bonjour,",
        "para1": "Para 1", "para2": "Para 2", "para3": "Para 3", "para4": "Para 4",
        "signature": "Test User"
    })
    
    # La méthode generate_content sera appelée deux fois
    mock_client.models.generate_content.side_effect = [mock_response_header, mock_response_body]

    cv_data = {"first_name": "Test", "last_name": "User", "contacts": {}}
    offer_data = {"title": "Job"}
    
    result = generate_letter_structure_with_gemini(offer_data, cv_data)

    assert result["header_blocks"]["fullname_block"] == "Test User"
    assert result["objet_line"] == "Objet: Test"
    assert result["para1"] == "Para 1"
    assert mock_client.models.generate_content.call_count == 2

# --- Test Generation Functions ---

def test_build_cover_letter_html_from_chunks():
    chunks = {
        "header_blocks": {"fullname_block": "John Doe"},
        "company_blocks": {"company_name_block": "ACME Inc."},
        "objet_line": "Objet: Candidature",
        "para1": "Ceci est le premier paragraphe.",
    }
    html = build_cover_letter_html_from_chunks(chunks)
    assert "<strong>John Doe</strong>" in html
    assert "ACME Inc." in html
    assert "Objet: Candidature" in html

@patch('functions.cover_letter_generator.generate_letter_structure_with_gemini')
@patch('functions.cover_letter_generator.build_cover_letter_docx_from_chunks')
@patch('functions.cover_letter_generator.convert_html_to_pdf')
def test_generate_personalized_cover_letter_pipeline(mock_pdf, mock_docx, mock_chunks):
    mock_chunks.return_value = {"para1": "Test"}
    mock_docx.return_value = "/tmp/test.docx"
    mock_pdf.return_value = "/tmp/test.pdf"

    result = generate_personalized_cover_letter_docx_and_pdf({}, {}, output_dir="/tmp")

    mock_chunks.assert_called_once()
    mock_docx.assert_called_once()
    mock_pdf.assert_called_once()
    assert result["docx_path"] == "/tmp/test.docx"
    assert result["pdf_path"] == "/tmp/test.pdf"