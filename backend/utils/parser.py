import re
import json

# Heuristique simple (remplaçable par un appel LLM) pour parser la requête
def parse_query(q: str):
    ql = q.lower()

    contrat = None
    if "alternance" in ql or "apprentissage" in ql:
        contrat = "apprenticeship"
    elif "stage" in ql or "intern" in ql:
        contrat = "internship"

    # naïf: extraire la ville comme mot après 'à ' ou 'sur '
    m = re.search(r"(?:à|sur)\s+([a-zA-ZÀ-ÿ\-\s]+)", q)
    lieu = m.group(1).strip() if m else None

    # titre: tout avant 'à' si présent
    titre = None
    parts = re.split(r"\bà\b", q, maxsplit=1)
    if parts:
        titre = parts[0].replace("je cherche", "").replace("trouve", "").strip()

    return {
        "intitule": titre or None,
        "lieu": lieu,
        "contrat": contrat or "internship",
        "remote_min": None,
        "salaire_min_eur": None
    }
