import pytest
import sys
import os
from unittest.mock import patch

# Ajout du dossier parent au path pour importer les modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from functions.compatibility import compute_heuristic_score, score_profile_with_gemini

def test_compute_heuristic_score_perfect_match():
    offer = {
        "title": "Data Scientist",
        "hard_skills": ["Python", "SQL"]
    }
    cv = {
        "raw_summary": "Data Scientist expert",
        "skills": {"hard_skills": ["Python", "SQL"]},
        "professional_experiences": []
    }
    # Skills: 100% -> 70 pts
    # Title: "data", "scientist" in summary -> 100% -> 30 pts
    # Total 100
    score = compute_heuristic_score(offer, cv)
    assert score == 100

def test_compute_heuristic_score_partial():
    offer = {
        "title": "Data Scientist",
        "hard_skills": ["Python", "SQL"]
    }
    cv = {
        "raw_summary": "Boulanger",
        "skills": {"hard_skills": ["Python"]}, # 50% skills -> 35 pts
        "professional_experiences": []
    }
    # Title: 0 match -> 0 pts
    # Total 35
    score = compute_heuristic_score(offer, cv)
    assert score == 35

@patch('functions.compatibility.generate_with_gemini')
def test_score_profile_with_gemini(mock_gen):
    # Simulation de la réponse JSON de Gemini
    mock_gen.return_value = '{"overall_score": 85, "summary": "Good match"}'
    
    res = score_profile_with_gemini({}, {})
    assert res["overall_score"] == 85
    assert res["summary"] == "Good match"