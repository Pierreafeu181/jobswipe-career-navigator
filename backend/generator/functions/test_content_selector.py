import pytest
import sys
import os
import json
from unittest.mock import patch

# Ajout du dossier parent au path pour importer les modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from functions.content_selector import select_all_relevant_content, _extract_json

class TestContentSelector:
    
    def test_extract_json_valid(self):
        raw = '```json\n{"key": "value"}\n```'
        assert _extract_json(raw) == {"key": "value"}

    def test_extract_json_no_markdown(self):
        raw = '{"key": "value"}'
        assert _extract_json(raw) == {"key": "value"}

    def test_extract_json_list(self):
        raw = '[{"key": "value"}]'
        assert _extract_json(raw) == [{"key": "value"}]

    @patch('functions.content_selector._generate_content')
    def test_select_all_relevant_content_success(self, mock_gen):
        # Mock response from Gemini
        mock_response = json.dumps({
            "selected_experiences": [{"source_title": "Exp 1", "company": "Comp A"}],
            "selected_projects": [{"title": "Proj 1"}],
            "selected_skills": {"hard_skills": ["Python"], "soft_skills": ["Teamwork"], "tools": []},
            "selected_interests": ["Coding"]
        })
        mock_gen.return_value = mock_response

        offer = {"title": "Dev"}
        user_data = {"experiences": [], "projects": [], "skills": {}, "interests": []}
        
        result = select_all_relevant_content(offer, user_data)
        
        assert len(result["experiences"]) == 1
        assert result["experiences"][0]["source_title"] == "Exp 1"
        assert "Python" in result["skills"]["hard_skills"]

    @patch('functions.content_selector._generate_content')
    def test_select_all_relevant_content_fallback(self, mock_gen):
        # Simulate invalid JSON response to trigger fallback
        mock_gen.return_value = "Not a JSON"
        
        offer = {"title": "Dev"}
        user_data = {
            "experiences": [{"source_title": "Exp 1"}, {"source_title": "Exp 2"}, {"source_title": "Exp 3"}, {"source_title": "Exp 4"}],
            "projects": [{"title": "Proj 1"}, {"title": "Proj 2"}, {"title": "Proj 3"}],
            "skills": {"hard_skills": ["Java"]},
            "interests": ["Reading"]
        }
        
        # Default limits are exp: 3, proj: 2
        result = select_all_relevant_content(offer, user_data)
        
        # Should return sliced lists based on limits
        assert len(result["experiences"]) == 3
        assert len(result["projects"]) == 2
        assert result["skills"] == user_data["skills"]