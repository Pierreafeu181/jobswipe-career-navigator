import pytest
import sys
import os
import json
from unittest.mock import patch

# Ajout du dossier parent au path pour importer les modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from functions.job_offer_parser import (
    detect_language,
    extract_json_from_output,
    parse_job_offer_gemini
)

class TestJobOfferParser:
    
    def test_detect_language(self):
        # Cas Français évident
        fr_text = "Nous recherchons un stagiaire (H/F) pour un poste en CDI. Vos missions seront..."
        assert detect_language(fr_text) == "fr"
        
        # Cas Anglais évident
        en_text = "We are looking for a software engineer. Responsibilities include..."
        assert detect_language(en_text) == "en"
        
        # Cas par défaut (égalité ou vide) -> fr
        assert detect_language("") == "fr"

    def test_extract_json_standard(self):
        raw = '{"key": "value"}'
        assert extract_json_from_output(raw) == {"key": "value"}

    def test_extract_json_markdown_block(self):
        raw = '```json\n{"key": "value"}\n```'
        assert extract_json_from_output(raw) == {"key": "value"}

    def test_extract_json_repair_trailing_comma(self):
        # Test de la regex de nettoyage des virgules
        raw = '{"list": [1, 2,], "key": "val",}'
        data = extract_json_from_output(raw)
        assert data["list"] == [1, 2]
        assert data["key"] == "val"

    @patch('functions.job_offer_parser.generate_with_gemini')
    def test_parse_job_offer_gemini(self, mock_generate):
        # Mock de la réponse de l'IA
        mock_response = json.dumps({
            "title": "Data Scientist",
            "company_name": "Airbus",
            "hard_skills": ["Python", "SQL"],
            "language": "fr"
        })
        mock_generate.return_value = mock_response
        
        offer_text = "Offre d'emploi Data Scientist chez Airbus..."
        result = parse_job_offer_gemini(offer_text)
        
        assert result["title"] == "Data Scientist"
        assert result["company_name"] == "Airbus"
        assert "Python" in result["hard_skills"]
        
        # Vérifie que generate_with_gemini a été appelé
        mock_generate.assert_called_once()
        # Vérifie que le prompt contient le texte de l'offre
        args, _ = mock_generate.call_args
        assert offer_text in args[0]