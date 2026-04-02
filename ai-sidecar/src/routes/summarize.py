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
    config: dict | None = None


class SummarizeResponse(BaseModel):
    summary: str


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest):
    mode_override = (req.config or {}).get("routing_mode")
    provider = sr.get_provider(req.is_sensitive, mode_override=mode_override)
    summary = await generate_text(
        f"Summarize the following:\n\n{req.text[:4000]}",
        SYSTEM_PROMPT,
        provider,
        req.config,
    )
    return SummarizeResponse(summary=summary.strip())
