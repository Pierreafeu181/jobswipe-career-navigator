import pytest
import sys
import os
from unittest.mock import patch, MagicMock, mock_open

# Ajout du dossier parent au path pour importer les modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from functions.generator_service import JobSwipeGeneratorService

class TestGeneratorService:
    
    @pytest.fixture
    def service(self):
        return JobSwipeGeneratorService(output_dir="/tmp/test_output")

    @patch('functions.generator_service.parse_cv_with_gemini')
    @patch('functions.generator_service.parse_job_offer_gemini')
    def test_parse_data(self, mock_offer, mock_cv, service):
        mock_cv.return_value = {"name": "Test"}
        mock_offer.return_value = {"title": "Job"}
        
        result = service.parse_data("cv text", "offer text")
        
        assert result["cv_parsed"] == {"name": "Test"}
        assert result["offer_parsed"] == {"title": "Job"}

    @patch('functions.generator_service.generate_full_cv_content')
    @patch('functions.generator_service.generate_cv_html')
    @patch('functions.generator_service.convert_html_to_pdf')
    def test_process_cv(self, mock_pdf, mock_html, mock_content, service):
        # Setup
        cv_parsed = {
            "full_name": "Test User",
            "contacts": {"emails": ["test@test.com"]},
            "raw_summary": "Summary",
            "social_links": [{"platform": "LinkedIn", "url": "http://linkedin.com/in/test"}]
        }
        offer_parsed = {"title": "Job Title"}
        
        # Mocks
        mock_content.return_value = {
            "cv_title": "Optimized CV",
            "experiences": [],
            "education": [],
            "skills": {},
            "interests": []
        }
        mock_html.return_value = "<html>Content</html>"
        mock_pdf.return_value = "/tmp/test_output/cv.pdf"
        
        # Execution (mock open to avoid file writing)
        with patch("builtins.open", mock_open()):
            result = service.process_cv(cv_parsed, offer_parsed)
            
        # Assertions
        assert "paths" in result
        assert "generated_content" in result
        assert result["generated_content"]["cv_title"] == "Optimized CV"
        # Vérifie que les liens sociaux sont bien traités
        assert result["generated_content"]["contact_info"]["linkedin"] == "http://linkedin.com/in/test"
        assert result["paths"]["cv_pdf"] == "/tmp/test_output/cv.pdf"

    @patch('functions.generator_service.generate_personalized_cover_letter_docx_and_pdf')
    def test_process_motivation(self, mock_gen_letter, service):
        mock_gen_letter.return_value = {
            "docx_path": "/tmp/cl.docx",
            "pdf_path": "/tmp/cl.pdf",
            "chunks": {"para1": "Hello"}
        }
        
        result = service.process_motivation({}, {})
        
        assert result["paths"]["cl_pdf"] == "/tmp/cl.pdf"
        assert result["generated_content"]["para1"] == "Hello"

    @patch('functions.generator_service.score_profile_with_gemini')
    def test_process_scoring(self, mock_score, service):
        mock_score.return_value = {"score": 85}
        result = service.process_scoring({}, {})
        assert result["score"] == 85

    @patch('functions.generator_service.compute_heuristic_score')
    def test_compute_fast_score(self, mock_compute, service):
        mock_compute.return_value = 70
        score = service.compute_fast_score({}, {})
        assert score == 70

    @patch('functions.generator_service.extract_text_from_file')
    @patch('functions.generator_service.parse_cv_with_gemini')
    def test_parse_cv_document(self, mock_parse, mock_extract, service):
        mock_extract.return_value = "Extracted text"
        mock_parse.return_value = {"name": "Parsed"}
        
        result = service.parse_cv_document(b"content", "cv.pdf")
        
        mock_extract.assert_called_with(b"content", "cv.pdf")
        mock_parse.assert_called_with("Extracted text", None)
        assert result == {"name": "Parsed"}