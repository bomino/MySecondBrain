import httpx
import anthropic
from config import settings


async def generate_embedding(text: str, provider: str) -> list[float]:
    if provider == "local":
        return await _ollama_embed(text)
    return await _cloud_embed(text)


async def generate_text(prompt: str, system: str, provider: str) -> str:
    if provider == "local":
        return await _ollama_generate(prompt, system)
    return await _cloud_generate(prompt, system)


async def _ollama_embed(text: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.embedding_model_local, "prompt": text},
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


async def _cloud_embed(text: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.embedding_model_local, "prompt": text},
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


async def _ollama_generate(prompt: str, system: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.chat_model_local,
                "prompt": prompt,
                "system": system,
                "stream": False,
            },
            timeout=120.0,
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def _cloud_generate(prompt: str, system: str) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model=settings.chat_model_cloud,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
