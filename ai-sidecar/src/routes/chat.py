from typing import Literal
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.rag import chat, chat_stream

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    query: str
    user_id: str
    routing_choice: str = "local"
    config: dict | None = None
    messages: list[ChatMessage] | None = None


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
    msgs = [m.model_dump() for m in req.messages] if req.messages else None
    result = await chat(req.query, req.user_id, req.routing_choice, req.config, msgs)
    return ChatResponse(**result)


@router.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    msgs = [m.model_dump() for m in req.messages] if req.messages else None
    return StreamingResponse(
        chat_stream(req.query, req.user_id, req.routing_choice, req.config, msgs),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
