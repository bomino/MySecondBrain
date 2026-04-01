from fastapi import APIRouter
from pydantic import BaseModel
from services.embedding import embed_entity

router = APIRouter()


class EmbedRequest(BaseModel):
    entity_type: str
    entity_id: str
    text: str
    is_sensitive: bool = False


class EmbedResponse(BaseModel):
    chunks_created: int


@router.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    chunks = await embed_entity(req.entity_type, req.entity_id, req.text, req.is_sensitive)
    return EmbedResponse(chunks_created=chunks)


class EmbedQueryRequest(BaseModel):
    text: str
    is_sensitive: bool = False


class EmbedQueryResponse(BaseModel):
    embedding: list[float]


@router.post("/embed-query", response_model=EmbedQueryResponse)
async def embed_query(req: EmbedQueryRequest):
    from services.sensitivity_router import SensitivityRouter
    from services.llm import generate_embedding
    from config import settings

    sr = SensitivityRouter(mode=settings.ai_routing_mode)
    provider = sr.get_provider(req.is_sensitive)
    embedding = await generate_embedding(req.text, provider)
    return EmbedQueryResponse(embedding=embedding)
