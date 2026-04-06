import json
from typing import AsyncGenerator

import httpx
import anthropic

from config import settings


def format_sse_token(text: str) -> str:
    return f'event: token\ndata: {json.dumps({"text": text})}\n\n'


def format_sse_sources(sources: list[dict], routed_to: str, has_sensitive_context: bool) -> str:
    data = {
        "sources": sources,
        "routed_to": routed_to,
        "has_sensitive_context": has_sensitive_context,
    }
    return f"event: sources\ndata: {json.dumps(data)}\n\n"


def format_sse_done() -> str:
    return "event: done\ndata: {}\n\n"


def format_sse_error(message: str) -> str:
    return f'event: error\ndata: {json.dumps({"message": message})}\n\n'


def format_sse_suggestions(suggestions: list[str]) -> str:
    return f"event: suggestions\ndata: {json.dumps({'suggestions': suggestions})}\n\n"


async def stream_ollama(prompt: str, system: str, config: dict | None = None) -> AsyncGenerator[str, None]:
    base_url = (config or {}).get("ollama_url") or settings.ollama_base_url
    model = (config or {}).get("chat_model_local") or settings.chat_model_local
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            f"{base_url}/api/generate",
            json={"model": model, "prompt": prompt, "system": system, "stream": True},
            timeout=120.0,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line:
                    data = json.loads(line)
                    if data.get("response"):
                        yield data["response"]


async def stream_anthropic(prompt: str, system: str, config: dict | None = None) -> AsyncGenerator[str, None]:
    api_key = (config or {}).get("api_key") or settings.anthropic_api_key
    if not api_key:
        async for chunk in stream_ollama(prompt, system, config):
            yield chunk
        return

    model = (config or {}).get("chat_model_cloud") or settings.chat_model_cloud
    client = anthropic.AsyncAnthropic(api_key=api_key)
    async with client.messages.stream(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def stream_openai_compatible(prompt: str, system: str, config: dict | None = None) -> AsyncGenerator[str, None]:
    base_url = (config or {}).get("openai_base_url") or settings.openai_base_url
    api_key = (config or {}).get("openai_api_key") or settings.openai_api_key
    model = (config or {}).get("openai_model") or settings.openai_model

    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            f"{base_url.rstrip('/')}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 2048,
                "stream": True,
            },
            timeout=120.0,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    data = json.loads(line[6:])
                    delta = data.get("choices", [{}])[0].get("delta", {})
                    if delta.get("content"):
                        yield delta["content"]


async def generate_text_stream(
    prompt: str, system: str, provider: str, config: dict | None = None
) -> AsyncGenerator[str, None]:
    if provider == "local":
        gen = stream_ollama(prompt, system, config)
    else:
        cloud_provider = (config or {}).get("cloud_provider", "anthropic")
        if cloud_provider == "openai":
            gen = stream_openai_compatible(prompt, system, config)
        else:
            gen = stream_anthropic(prompt, system, config)

    async for chunk in gen:
        yield chunk
