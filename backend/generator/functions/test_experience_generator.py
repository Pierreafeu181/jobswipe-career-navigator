import pytest
import sys
import os
import json
from unittest.mock import patch

# Ajout du dossier parent au path pour importer les modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from functions.experience_generator import generate_full_cv_content, _extract_json

class TestExperienceGenerator:

    def test_extract_json_helper(self):
        """Teste l'utilitaire interne d'extraction JSON."""
        raw = '```json\n{"cv_title": "Test"}\n```'
        assert _extract_json(raw) == {"cv_title": "Test"}

    @patch('functions.experience_generator._generate_with_gemini')
    def test_generate_full_cv_content_success(self, mock_generate):
        # 1. Données de mock
        mock_offer = {"title": "Développeur Python", "hard_skills": ["Python", "Django"]}
        mock_user_data = {
            "profile": {"summary": "Étudiant en informatique."},
            "experiences": [
                {
                    "title": "Stagiaire",
                    "company": "OldCorp",
                    "description": "Développement d'un site en PHP."
                }
            ],
            "skills": {"hard_skills": ["Python", "PHP"]}
        }
        
        # 2. Réponse mockée de Gemini
        mock_response_json = {
            "cv_title": "Développeur Python Backend",
            "objective": "Objectif optimisé pour le poste.",
            "experiences": [
                {
                    "source_title": "Stagiaire",
                    "target_title": "Stagiaire en Développement Backend",
                    "company": "OldCorp",
                    "bullets": ["Reformulation de l'expérience avec les mots-clés Python."]
                }
            ],
            "skills": {
                "sections": [{"section_title": "Langages", "items": ["Python"]}],
                "highlighted": ["Python", "Django"]
            },
            "projects": [], "education": [], "interests": []
        }
        mock_generate.return_value = json.dumps(mock_response_json)

        # 3. Appel de la fonction
        result = generate_full_cv_content(mock_offer, mock_user_data)

        # 4. Assertions
        mock_generate.assert_called_once()
        prompt_arg = mock_generate.call_args[0][0]
        
        # Vérifie que le prompt contient les infos clés
        assert "DONNÉES CIBLES (OFFRE)" in prompt_arg
        assert "Développeur Python" in prompt_arg
        assert "DONNÉES SOURCES (UTILISATEUR)" in prompt_arg
        assert "Étudiant en informatique" in prompt_arg
        
        # Vérifie le résultat
        assert result["cv_title"] == "Développeur Python Backend"
        assert len(result["experiences"]) == 1
        assert "Python" in result["experiences"][0]["bullets"][0]

    @patch('functions.experience_generator._generate_with_gemini')
    def test_generate_full_cv_content_with_empty_source(self, mock_generate):
        """Teste que les sections vides en entrée résultent en sections vides en sortie."""
        mock_offer = {"title": "Développeur"}
        mock_user_data = {"profile": {}, "experiences": [], "projects": [], "education": [], "skills": {}, "interests": []}
        
        # Gemini doit être instruit de retourner des listes vides
        mock_response_json = {"experiences": [], "projects": [], "skills": {"sections": [], "highlighted": []}}
        mock_generate.return_value = json.dumps(mock_response_json)

        result = generate_full_cv_content(mock_offer, mock_user_data)

        assert result["experiences"] == []
        assert result["projects"] == []
        assert result["skills"]["highlighted"] == []