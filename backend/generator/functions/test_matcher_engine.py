import pytest
import numpy as np
import sys
import os
from unittest.mock import patch, MagicMock

# Ajout du dossier parent au path pour importer les modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from functions.matcher_engine import (
    calculate_cosine_similarity_spacy,
    batch_match_offers,
    analyze_missing_keywords_spacy,
    preprocess_text_spacy,
    vectorize_text_spacy
)

def test_calculate_cosine_similarity_spacy():
    # Cas vecteurs identiques
    vec_a = np.array([1, 0, 0])
    vec_b = np.array([1, 0, 0])
    
    # On mock cosine_similarity de sklearn pour éviter la dépendance forte
    with patch('functions.matcher_engine.cosine_similarity') as mock_cosine:
        mock_cosine.return_value = [[1.0]]
        score = calculate_cosine_similarity_spacy(vec_a, vec_b)
        assert score == 100

    # Cas vecteurs orthogonaux
    with patch('functions.matcher_engine.cosine_similarity') as mock_cosine:
        mock_cosine.return_value = [[0.0]]
        score = calculate_cosine_similarity_spacy(vec_a, np.array([0, 1, 0]))
        assert score == 0

def test_batch_match_offers():
    # On mock vectorize_text_spacy pour ne pas charger le modèle spaCy
    with patch('functions.matcher_engine.vectorize_text_spacy') as mock_vec:
        # On définit les retours successifs : 1er appel = CV, suivants = Offres
        mock_vec.side_effect = [
            np.array([1, 0]), # CV
            np.array([1, 0]), # Offre 1 (Match parfait)
            np.array([0, 1]), # Offre 2 (Pas de match)
        ]
        
        # Mock cosine pour correspondre aux vecteurs ci-dessus
        with patch('functions.matcher_engine.calculate_cosine_similarity_spacy') as mock_calc:
            mock_calc.side_effect = [100, 0]
            
            cv_data = {"raw_summary": "Test CV"}
            offers = {
                "1": {"description": "Offer 1"},
                "2": {"description": "Offer 2"}
            }
            
            scores = batch_match_offers(cv_data, offers)
            
            assert scores["1"] == 100
            assert scores["2"] == 0

def test_analyze_missing_keywords_spacy():
    # Test de la logique d'extraction de mots-clés manquants
    with patch('functions.matcher_engine.CountVectorizer') as MockVectorizer:
        mock_instance = MockVectorizer.return_value
        mock_instance.fit.return_value = None
        # Le vocabulaire de l'offre contient 3 termes
        mock_instance.get_feature_names_out.return_value = np.array(["python", "java", "sql"])
        
        # Mock transform pour le CV : [1, 0, 1] -> python présent, java absent, sql présent
        mock_transform = MagicMock()
        mock_transform.toarray.return_value = np.array([[1, 0, 1]])
        mock_instance.transform.return_value = mock_transform
        
        # Mock spaCy pour éviter le chargement des stop words
        with patch('functions.matcher_engine._get_spacy_model') as mock_get_model:
            mock_nlp = MagicMock()
            mock_nlp.Defaults.stop_words = {"le", "la"}
            mock_get_model.return_value = mock_nlp
            
            res = analyze_missing_keywords_spacy("cv text", "job text")
            
            assert isinstance(res, dict)
            assert "missing_keywords" in res
            # "java" est absent du CV (0 dans le masque), donc il doit être dans missing_keywords
            assert "java" in res["missing_keywords"]
            assert "python" not in res["missing_keywords"]

def test_preprocess_text_spacy():
    with patch('functions.matcher_engine._get_spacy_model') as mock_get_model:
        mock_nlp = MagicMock()
        # Simulation du doc spaCy et des tokens
        mock_token = MagicMock()
        mock_token.lemma_ = "test"
        mock_token.is_stop = False
        mock_token.is_punct = False
        mock_token.is_space = False
        
        mock_nlp.return_value = [mock_token]
        mock_get_model.return_value = mock_nlp
        
        tokens = preprocess_text_spacy("Test string")
        assert tokens == ["test"]

def test_vectorize_text_spacy():
    with patch('functions.matcher_engine._get_spacy_model') as mock_get_model:
        mock_nlp = MagicMock()
        mock_nlp.return_value.vector = np.array([0.5, 0.5])
        mock_get_model.return_value = mock_nlp
        
        vec = vectorize_text_spacy("test")
        assert vec is not None
        assert len(vec) == 2