from fastapi import APIRouter
from pydantic import BaseModel
from services.digest import generate_digest

router = APIRouter()


class DigestRequest(BaseModel):
    user_id: str


@router.post("/digest")
async def get_digest(req: DigestRequest):
    result = await generate_digest(req.user_id)
    return result
