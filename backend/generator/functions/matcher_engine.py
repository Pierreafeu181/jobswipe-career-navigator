"""
matcher_engine.py

Moteur de matching NLP utilisant spaCy et Scikit-Learn.
Ce module est indépendant de l'API Gemini et fonctionne en local.
"""

try:
    import spacy
    import spacy.cli
    import numpy as np
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.feature_extraction.text import CountVectorizer
except ImportError:
    spacy = None
    np = None
    cosine_similarity = None
    CountVectorizer = None

# ============================================================================
# MOTEUR NLP (RESUME MATCHER) - SPA CY & SCIKIT-LEARN
# ============================================================================

_nlp_model = None

def _get_spacy_model():
    """Charge le modèle spaCy en mémoire (singleton)."""
    global _nlp_model
    if _nlp_model is None and spacy is not None:
        try:
            # Tente de charger le modèle, sinon essaie de le télécharger
            if not spacy.util.is_package("fr_core_news_md"):
                print("[INFO] Modèle 'fr_core_news_md' introuvable. Tentative de téléchargement...")
                spacy.cli.download("fr_core_news_md")
            _nlp_model = spacy.load("fr_core_news_md")
        except Exception as e:
            print(f"[ERROR] Impossible de charger spaCy 'fr_core_news_md': {e}")
    return _nlp_model

def preprocess_text_spacy(text: str) -> list[str]:
    """
    1. FONCTION PREPROCESS
    Utilise spaCy ('fr_core_news_md') pour nettoyer le texte :
    - Mise en minuscule
    - Retrait de la ponctuation et des stop words
    - Lemmatisation
    
    Args:
        text (str): Le texte brut (CV ou Offre).
        
    Returns:
        list[str]: Une liste de tokens propres (lemmes).
    """
    nlp = _get_spacy_model()
    if not nlp or not text:
        return []
    
    doc = nlp(text.lower())
    
    # Filtrage : pas de stop words, pas de ponctuation, pas d'espaces
    clean_tokens = [
        token.lemma_ for token in doc 
        if not token.is_stop and not token.is_punct and not token.is_space
    ]
    
    return clean_tokens

def vectorize_text_spacy(text: str):
    """
    2. FONCTION VECTORIZE
    Prend le texte et retourne le "Document Vector".
    Ce vecteur est la moyenne des embeddings de chaque mot (word vectors fournis par spaCy).
    
    Args:
        text (str): Le texte brut.
        
    Returns:
        numpy.ndarray: Le vecteur du document.
    """
    nlp = _get_spacy_model()
    if not nlp or not text:
        return None
        
    doc = nlp(text)
    # doc.vector est une propriété de spaCy qui retourne la moyenne des vecteurs des mots
    return doc.vector

def calculate_cosine_similarity_spacy(vec_a, vec_b) -> int:
    """
    3. FONCTION COSINE_SIMILARITY
    Implémente la formule (A.B) / (||A||*||B||) via Scikit-Learn pour comparer 
    le vecteur du CV et celui de l'offre.
    
    Args:
        vec_a (numpy.ndarray): Vecteur du CV.
        vec_b (numpy.ndarray): Vecteur de l'offre.
        
    Returns:
        int: Un score de similarité entre 0 et 100.
    """
    if vec_a is None or vec_b is None or cosine_similarity is None:
        return 0
    
    # Reshape nécessaire pour scikit-learn (attend un tableau 2D)
    vec_a_reshaped = vec_a.reshape(1, -1)
    vec_b_reshaped = vec_b.reshape(1, -1)
    
    # Calcul de la similarité cosinus
    similarity_matrix = cosine_similarity(vec_a_reshaped, vec_b_reshaped)
    similarity_score = similarity_matrix[0][0]
    
    # Conversion en pourcentage (0-100) et arrondi
    return int(round(max(0, min(100, similarity_score * 100))))

def analyze_missing_keywords_spacy(cv_text: str, job_desc: str) -> dict:
    """
    4. FONCTION KEYWORD_ANALYSIS
    Utilise les N-Grams (bigrammes et trigrammes) pour identifier les expressions clés 
    manquantes dans le CV par rapport à l'offre (approche statistique).
    
    Args:
        cv_text (str): Texte du CV.
        job_desc (str): Texte de l'offre.
        
    Returns:
        dict: Dictionnaire contenant les mots-clés manquants.
    """
    if CountVectorizer is None or not cv_text or not job_desc:
        return {"missing_keywords": []}
    
    # Récupération des stop words français depuis le modèle spaCy
    nlp = _get_spacy_model()
    stop_words = list(nlp.Defaults.stop_words) if nlp else None
    
    # Configuration pour extraire bigrammes et trigrammes, en ignorant les stop words
    # Si stop_words est None, aucun filtrage n'est fait (fallback)
    vectorizer = CountVectorizer(ngram_range=(2, 3), stop_words=stop_words)
    
    try:
        # On fit sur l'offre pour connaître le vocabulaire cible
        vectorizer.fit([job_desc])
        job_features = vectorizer.get_feature_names_out()
        
        # On transforme le CV pour voir ce qu'il contient de ce vocabulaire
        cv_vector = vectorizer.transform([cv_text])
        cv_features_mask = cv_vector.toarray()[0]
        
        missing_keywords = []
        for i, feature_name in enumerate(job_features):
            # Si le n-gram est présent dans l'offre mais absent du CV
            if cv_features_mask[i] == 0:
                missing_keywords.append(feature_name)
        
        # On retourne les 10 premiers manquants
        return {"missing_keywords": missing_keywords[:10]}
        
    except ValueError:
        return {"missing_keywords": []}

def batch_match_offers(cv_input, offers_dict: dict) -> dict:
    """
    6. FONCTION BATCH MATCHING
    Calcule le score de matching pour un dictionnaire d'offres par rapport à un CV.
    Optimisé pour ne vectoriser le CV qu'une seule fois.
    
    Args:
        cv_input (str | dict): Le texte du CV ou un dictionnaire de profil structuré.
        offers_dict (dict): Dictionnaire d'offres {id: "texte"} ou {id: {"description": "texte", ...}}.
        
    Returns:
        dict: Dictionnaire {id: score}.
    """
    # 1. Extraction/Construction du texte du CV
    cv_text = ""
    if isinstance(cv_input, str):
        cv_text = cv_input
    elif isinstance(cv_input, dict):
        # Construction d'un texte riche depuis le profil structuré
        parts = []
        if cv_input.get("raw_summary"):
            parts.append(cv_input["raw_summary"])
        
        # Ajout des compétences
        skills = cv_input.get("skills", {})
        if isinstance(skills, dict):
            parts.extend(skills.get("hard_skills", []))
            parts.extend(skills.get("soft_skills", []))
        elif isinstance(skills, list):
             parts.extend(skills)
        
        # Ajout des expériences
        for exp in cv_input.get("professional_experiences", []):
            if isinstance(exp, dict):
                if exp.get("title"): parts.append(exp["title"])
                if exp.get("description"): parts.append(exp["description"])
            
        cv_text = " ".join([str(p) for p in parts if p])
    
    scores = {}
    
    # 2. Vectorisation du CV (une seule fois)
    cv_vec = vectorize_text_spacy(cv_text)
    
    if cv_vec is None:
        return {k: 0 for k in offers_dict}

    # 3. Boucle sur les offres
    for key, value in offers_dict.items():
        text_offre = ""
        if isinstance(value, str):
            text_offre = value
        elif isinstance(value, dict):
            # Priorité à la description
            text_offre = value.get("description", "")
            # Si pas de description, on concatène ce qu'on trouve
            if not text_offre:
                parts = [value.get("title", ""), value.get("company_name", "")]
                parts.extend(value.get("hard_skills", []) if isinstance(value.get("hard_skills"), list) else [])
                text_offre = " ".join([str(p) for p in parts if p])
        
        if not text_offre:
            scores[key] = 0
            continue
            
        offer_vec = vectorize_text_spacy(text_offre)
        score = calculate_cosine_similarity_spacy(cv_vec, offer_vec)
        scores[key] = score
        
    return scores

def run_matcher_demo(cv_text: str, job_desc: str):
    """
    5. FONCTION MAIN (Exemple d'exécution)
    """
    print("\n--- DÉMO MATCHER ENGINE (spaCy) ---")
    
    # 1. Preprocess
    print("[1] Prétraitement...")
    cv_tokens = preprocess_text_spacy(cv_text)
    print(f"   CV Tokens (extrait): {cv_tokens[:5]}...")
    
    # 2. Vectorize
    print("[2] Vectorisation...")
    cv_vec = vectorize_text_spacy(cv_text)
    job_vec = vectorize_text_spacy(job_desc)
    
    if cv_vec is not None and job_vec is not None:
        # 3. Cosine Similarity
        print("[3] Similarité Cosinus...")
        score = calculate_cosine_similarity_spacy(cv_vec, job_vec)
        print(f"   Score de compatibilité : {score}/100")
    else:
        print("   [Erreur] Impossible de vectoriser (modèle spaCy manquant ?)")

    # 4. Keyword Analysis
    print("[4] Analyse des mots-clés manquants...")
    analysis = analyze_missing_keywords_spacy(cv_text, job_desc)
    print(f"   Mots-clés manquants : {analysis.get('missing_keywords')}")

if __name__ == "__main__":
    # Exemple simple pour tester si le script est exécuté directement
    print("--- TEST DU MOTEUR DE MATCHING (FRANÇAIS) ---")
    
    # 1. Données structurées (Format Application)
    print("\n[1] Test avec Profil et Offres structurés (JSON)")
    
    cv_struct = {
        "first_name": "Jean",
        "last_name": "Dupont",
        "raw_summary": "Développeur Full Stack Senior avec 7 ans d'expérience, spécialisé en Python et React.",
        "skills": {
            "hard_skills": ["Python", "JavaScript", "TypeScript", "Java", "React", "Django", "Spring Boot", "Docker", "Kubernetes", "AWS", "PostgreSQL"],
            "soft_skills": ["Agile", "Scrum", "Leadership", "Mentoring"]
        },
        "professional_experiences": [
            {
                "title": "Lead Développeur Full Stack",
                "company": "Tech Solutions",
                "description": "Conception d'architectures microservices, migration vers le cloud AWS, encadrement de 3 développeurs juniors."
            },
            {
                "title": "Développeur Backend Python",
                "company": "StartupFlow",
                "description": "Développement d'API REST avec Django DRF, optimisation des requêtes SQL."
            }
        ],
        "education": [
            {
                "degree": "Master 2 Ingénierie Logicielle",
                "school": "Université de Technologie"
            }
        ]
    }
    
    offres_batch = {
        "job_1_perfect_match": {
            "title": "Développeur Python / React Senior (H/F)",
            "company_name": "SaaS Corp",
            "description": "Nous recherchons un Lead Dev pour notre stack Python/React. Expérience AWS et Docker requise.",
            "hard_skills": ["Python", "React", "Django", "AWS", "Docker"]
        },
        "job_2_partial_match": {
            "title": "Data Scientist Senior",
            "company_name": "AI Lab",
            "description": "Expert en Python pour des modèles de Machine Learning. Connaissance de Kubernetes appréciée.",
            "hard_skills": ["Python", "Machine Learning", "TensorFlow", "Kubernetes"]
        },
        "job_3_no_match": {
            "title": "Boulanger Pâtissier (H/F)",
            "company_name": "Boulangerie Artisanale",
            "description": "Préparation des pains et viennoiseries. CAP Boulanger requis.",
            "hard_skills": ["Pétrissage", "Cuisson", "Hygiène"]
        }
    }
    
    scores = batch_match_offers(cv_struct, offres_batch)
    print(f"Scores calculés pour 3 offres : {scores}")

    # 2. Test unitaire détaillé (Texte)
    print("\n[2] Test unitaire détaillé (Texte brut)")
    # On reconstruit un texte simple pour la démo détaillée
    cv_text_demo = cv_struct["raw_summary"] + " " + " ".join(cv_struct["skills"]["hard_skills"])
    job_text_demo = offres_batch["job_1_perfect_match"]["description"]
    
    run_matcher_demo(cv_text_demo, job_text_demo)
