from fastapi import APIRouter
from pydantic import BaseModel
from services.sensitivity_router import SensitivityRouter
from services.llm import generate_text
from config import settings

router = APIRouter()
sr = SensitivityRouter(mode=settings.ai_routing_mode)

SYSTEM_PROMPT = """You are a summarization assistant. Provide a concise summary of the given content.
Keep it to 2-4 sentences. Focus on key points and actionable information."""


class SummarizeRequest(BaseModel):
    text: str
    is_sensitive: bool = False


class SummarizeResponse(BaseModel):
    summary: str


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest):
    provider = sr.get_provider(req.is_sensitive)
    summary = await generate_text(
        f"Summarize the following:\n\n{req.text[:4000]}",
        SYSTEM_PROMPT,
        provider,
    )
    return SummarizeResponse(summary=summary.strip())
