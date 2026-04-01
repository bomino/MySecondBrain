from fastapi import APIRouter
from pydantic import BaseModel
from services.sensitivity_router import SensitivityRouter
from services.llm import generate_text
from config import settings

router = APIRouter()
sr = SensitivityRouter(mode=settings.ai_routing_mode)

SYSTEM_PROMPT = """You are a tagging assistant. Given content, suggest 1-5 short tags (1-3 words each).
Return ONLY a JSON array of strings. Example: ["machine-learning", "python", "tutorial"]
Do not include explanations."""


class AutoTagRequest(BaseModel):
    text: str
    is_sensitive: bool = False
    existing_tags: list[str] = []


class AutoTagResponse(BaseModel):
    suggested_tags: list[str]


@router.post("/auto-tag", response_model=AutoTagResponse)
async def auto_tag(req: AutoTagRequest):
    provider = sr.get_provider(req.is_sensitive)

    prompt = f"Content:\n{req.text[:2000]}\n\nExisting tags in system: {', '.join(req.existing_tags) if req.existing_tags else 'none'}\n\nSuggest tags:"

    response = await generate_text(prompt, SYSTEM_PROMPT, provider)

    import json
    try:
        tags = json.loads(response.strip())
        if isinstance(tags, list):
            return AutoTagResponse(suggested_tags=[str(t).lower().strip() for t in tags[:5]])
    except json.JSONDecodeError:
        pass

    return AutoTagResponse(suggested_tags=[])
