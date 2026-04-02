import httpx
import anthropic
from config import settings


async def generate_embedding(text: str, provider: str, config: dict | None = None) -> list[float]:
    if provider == "local":
        return await _ollama_embed(text, config)
    return await _cloud_embed(text, config)


async def generate_text(prompt: str, system: str, provider: str, config: dict | None = None) -> str:
    if provider == "local":
        return await _ollama_generate(prompt, system, config)
    return await _cloud_generate(prompt, system, config)


async def _ollama_embed(text: str, config: dict | None = None) -> list[float]:
    base_url = (config or {}).get("ollama_url") or settings.ollama_base_url
    model = (config or {}).get("embedding_model") or settings.embedding_model_local
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/api/embeddings",
            json={"model": model, "prompt": text},
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


async def _cloud_embed(text: str, config: dict | None = None) -> list[float]:
    # Uses local Ollama for all embeddings to ensure consistent vector dimensions (768).
    # Cloud embedding APIs use different dimensions which would break pgvector similarity search.
    base_url = (config or {}).get("ollama_url") or settings.ollama_base_url
    model = (config or {}).get("embedding_model") or settings.embedding_model_local
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/api/embeddings",
            json={"model": model, "prompt": text},
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


async def _ollama_generate(prompt: str, system: str, config: dict | None = None) -> str:
    base_url = (config or {}).get("ollama_url") or settings.ollama_base_url
    model = (config or {}).get("chat_model_local") or settings.chat_model_local
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "system": system,
                "stream": False,
            },
            timeout=120.0,
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def _cloud_generate(prompt: str, system: str, config: dict | None = None) -> str:
    api_key = (config or {}).get("api_key") or settings.anthropic_api_key
    model = (config or {}).get("chat_model_cloud") or settings.chat_model_cloud
    client = anthropic.AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
