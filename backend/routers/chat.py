from fastapi import APIRouter
from pydantic import BaseModel
from utils.parser import parse_query

router = APIRouter()

class ParseIn(BaseModel):
    query: str

@router.post("/parse")
def parse(in_: ParseIn):
    # Appelle un parser LLM ou une règle heuristique
    return parse_query(in_.query)
