from fastapi import APIRouter
from pydantic import BaseModel
from services.sensitivity_router import SensitivityRouter
from services.llm import generate_text
from config import settings

router = APIRouter()
sr = SensitivityRouter(mode=settings.ai_routing_mode)

PROMPTS = {
    "improve": "Improve the following text. Fix grammar, clarity, and flow. Return ONLY the improved text, nothing else.",
    "simplify": "Simplify the following text. Make it clearer and more concise. Return ONLY the simplified text, nothing else.",
    "expand": "Expand the following text with more detail and examples. Return ONLY the expanded text, nothing else.",
    "summarize": "Summarize the following text in 1-2 sentences. Return ONLY the summary, nothing else.",
}


class TransformRequest(BaseModel):
    text: str
    action: str
    is_sensitive: bool = False
    config: dict | None = None


class TransformResponse(BaseModel):
    result: str


@router.post("/transform", response_model=TransformResponse)
async def transform(req: TransformRequest):
    system = PROMPTS.get(req.action, PROMPTS["improve"])
    mode_override = (req.config or {}).get("routing_mode")
    provider = sr.get_provider(req.is_sensitive, mode_override=mode_override)
    result = await generate_text(req.text, system, provider, req.config)
    return TransformResponse(result=result.strip())
