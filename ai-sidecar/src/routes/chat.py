from fastapi import APIRouter
from pydantic import BaseModel
from services.rag import chat

router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    user_id: str
    routing_choice: str = "local"
    config: dict | None = None


class Source(BaseModel):
    type: str
    id: str
    title: str
    similarity: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    routed_to: str
    has_sensitive_context: bool = False


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    result = await chat(req.query, req.user_id, req.routing_choice, req.config)
    return ChatResponse(**result)
