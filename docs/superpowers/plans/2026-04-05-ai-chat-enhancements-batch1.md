# AI Chat Enhancements (Batch 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the AI Chat from single-turn plain-text Q&A into a multi-turn streaming assistant with markdown rendering, relevance filtering, and copy-to-clipboard.

**Architecture:** Five enhancements layered bottom-up: sidecar streaming + multi-turn first (backend), then Next.js API relay, then frontend rendering (markdown, streaming reader, copy button). Similarity threshold is a small backend-only change. Each enhancement is independently testable.

**Tech Stack:** FastAPI (SSE via StreamingResponse), Anthropic SDK streaming, Ollama streaming API, Next.js API routes (ReadableStream relay), React (react-markdown, rehype-highlight), Vitest, pytest

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `ai-sidecar/src/services/llm_stream.py` | Streaming text generation for all 3 providers |
| `ai-sidecar/tests/test_rag.py` | Tests for similarity threshold + multi-turn prompt building |
| `ai-sidecar/tests/test_llm_stream.py` | Tests for SSE event format from streaming generators |
| `web/src/lib/sse-reader.ts` | Generic SSE ReadableStream parser utility |
| `web/__tests__/lib/sse-reader.test.ts` | Tests for SSE parser |
| `web/src/components/ai/chat-markdown.tsx` | Markdown renderer wrapper for chat messages |

### Modified files
| File | Changes |
|------|---------|
| `ai-sidecar/src/services/rag.py` | Add `MIN_SIMILARITY_THRESHOLD`, filter chunks, `chat_stream()`, multi-turn prompt, no-context system prompt |
| `ai-sidecar/src/services/llm.py` | Add `generate_text_with_messages()` for multi-turn (non-streaming) |
| `ai-sidecar/src/routes/chat.py` | Add `ChatStreamRequest` model, `/chat/stream` SSE endpoint |
| `web/src/app/api/v1/ai/chat/route.ts` | Add streaming relay, pass `messages` to sidecar |
| `web/src/hooks/use-ai-chat.ts` | Switch to streaming endpoint, send last 10 messages |
| `web/src/components/ai/chat-message.tsx` | Use markdown renderer for assistant messages, add copy button |
| `web/src/components/ai/chat-panel.tsx` | Render partial messages during stream |
| `web/src/lib/ai-client.ts` | Add `streamSidecar()` for SSE relay |
| `web/package.json` | Add react-markdown, rehype-highlight |

---

## Task 1: Similarity Threshold Filtering (Backend)

**Files:**
- Modify: `ai-sidecar/src/services/rag.py:19-45` (retrieve_context) and `ai-sidecar/src/services/rag.py:48-112` (chat)
- Create: `ai-sidecar/tests/test_rag.py`

- [ ] **Step 1: Write test for similarity threshold filtering**

Create `ai-sidecar/tests/test_rag.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.rag import filter_chunks_by_similarity, build_system_prompt, MIN_SIMILARITY_THRESHOLD


def test_filters_chunks_below_threshold():
    # #given
    chunks = [
        {"chunk_text": "relevant", "similarity": 0.6, "entity_type": "note", "entity_id": "1", "title": "A"},
        {"chunk_text": "irrelevant", "similarity": 0.1, "entity_type": "note", "entity_id": "2", "title": "B"},
        {"chunk_text": "borderline", "similarity": 0.3, "entity_type": "note", "entity_id": "3", "title": "C"},
    ]

    # #when
    filtered = filter_chunks_by_similarity(chunks)

    # #then
    assert len(filtered) == 2
    assert filtered[0]["chunk_text"] == "relevant"
    assert filtered[1]["chunk_text"] == "borderline"


def test_returns_empty_when_all_below_threshold():
    # #given
    chunks = [
        {"chunk_text": "low", "similarity": 0.1, "entity_type": "note", "entity_id": "1", "title": "A"},
    ]

    # #when
    filtered = filter_chunks_by_similarity(chunks)

    # #then
    assert filtered == []


def test_threshold_constant_is_0_3():
    assert MIN_SIMILARITY_THRESHOLD == 0.3


def test_system_prompt_with_context():
    # #when
    prompt = build_system_prompt(has_context=True)

    # #then
    assert "ONLY the provided context" in prompt
    assert "general knowledge" not in prompt


def test_system_prompt_without_context():
    # #when
    prompt = build_system_prompt(has_context=False)

    # #then
    assert "did not contain relevant information" in prompt
    assert "general knowledge" in prompt
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ai-sidecar && python -m pytest tests/test_rag.py -v`
Expected: FAIL — `filter_chunks_by_similarity` and `build_system_prompt` don't exist yet

- [ ] **Step 3: Implement similarity filtering in rag.py**

Modify `ai-sidecar/src/services/rag.py`. Add after imports (line 7):

```python
MIN_SIMILARITY_THRESHOLD = 0.3


def filter_chunks_by_similarity(chunks: list[dict]) -> list[dict]:
    return [c for c in chunks if c.get("similarity", 0) >= MIN_SIMILARITY_THRESHOLD]


def build_system_prompt(has_context: bool) -> str:
    if has_context:
        return SYSTEM_PROMPT
    return """You are a personal knowledge assistant. The user's knowledge base did not contain relevant information for this query. You may answer from your general knowledge, but preface your answer with a brief note that you didn't find relevant notes in their knowledge base.

Rules:
- Be concise and direct
- Never make up information
- Clearly indicate this is general knowledge, not from their notes"""
```

Then modify the `chat()` function (line 48+) to use filtering. Replace the existing empty-chunks check and context-building logic:

```python
async def chat(query: str, user_id: str, routing_choice: str = "local", config: dict | None = None) -> dict:
    raw_chunks = await retrieve_context(query, user_id, config=config)
    chunks = filter_chunks_by_similarity(raw_chunks)
    has_context = len(chunks) > 0

    if not has_context:
        mode_override = (config or {}).get("routing_mode")
        provider = sr.get_provider(False, mode_override=mode_override)
        if not mode_override:
            provider = routing_choice

        prompt = f"Question: {query}"
        system = build_system_prompt(has_context=False)
        answer = await generate_text(prompt, system, provider, config)
        return {
            "answer": answer,
            "sources": [],
            "routed_to": provider,
            "has_sensitive_context": False,
        }

    # ... rest of existing logic with sensitive content handling, but use filtered `chunks`
    # (keep existing code from line 58 onwards, it already uses `chunks`)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ai-sidecar && python -m pytest tests/test_rag.py -v`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add ai-sidecar/src/services/rag.py ai-sidecar/tests/test_rag.py
git commit -m "feat(ai): add similarity threshold filtering for RAG context

Chunks below 0.3 cosine similarity are discarded. When no relevant
context exists, the LLM answers from general knowledge with a disclaimer."
```

---

## Task 2: Multi-Turn Conversation Context (Backend)

**Files:**
- Modify: `ai-sidecar/src/services/llm.py:12-15` (generate_text)
- Modify: `ai-sidecar/src/services/rag.py` (chat function)
- Modify: `ai-sidecar/src/routes/chat.py:8-12` (ChatRequest model)
- Test: `ai-sidecar/tests/test_rag.py` (add tests)

- [ ] **Step 1: Write tests for multi-turn prompt building**

Append to `ai-sidecar/tests/test_rag.py`:

```python
from services.rag import build_multi_turn_prompt


def test_build_multi_turn_prompt_with_history():
    # #given
    messages = [
        {"role": "user", "content": "What are my goals?"},
        {"role": "assistant", "content": "Based on your notes, you have 3 goals..."},
    ]
    new_query = "Tell me more about the second one"
    context = "[Goals] (note):\nMy goals are: 1. Learn Rust 2. Ship product 3. Exercise"

    # #when
    result = build_multi_turn_prompt(new_query, context, messages)

    # #then
    assert "What are my goals?" in result
    assert "Based on your notes, you have 3 goals" in result
    assert "Tell me more about the second one" in result
    assert context in result


def test_build_multi_turn_prompt_without_history():
    # #given
    new_query = "What did I write?"
    context = "[Notes] (note):\nSome content"

    # #when
    result = build_multi_turn_prompt(new_query, context, messages=None)

    # #then
    assert "What did I write?" in result
    assert context in result


def test_build_multi_turn_prompt_without_context():
    # #given
    new_query = "What is the speed of light?"

    # #when
    result = build_multi_turn_prompt(new_query, context=None, messages=None)

    # #then
    assert "What is the speed of light?" in result
    assert "Context from knowledge base" not in result
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ai-sidecar && python -m pytest tests/test_rag.py::test_build_multi_turn_prompt_with_history -v`
Expected: FAIL — `build_multi_turn_prompt` doesn't exist

- [ ] **Step 3: Implement multi-turn prompt builder in rag.py**

Add to `ai-sidecar/src/services/rag.py` after `build_system_prompt`:

```python
def build_multi_turn_prompt(query: str, context: str | None = None, messages: list[dict] | None = None) -> str:
    parts = []

    if context:
        parts.append(f"Context from knowledge base:\n\n{context}\n\n---\n")

    if messages:
        parts.append("Conversation history:\n")
        for msg in messages:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            parts.append(f"{role_label}: {msg['content']}\n")
        parts.append("---\n")

    parts.append(f"Question: {query}")
    return "\n".join(parts)
```

- [ ] **Step 4: Update ChatRequest model to accept messages**

Modify `ai-sidecar/src/routes/chat.py` — update `ChatRequest`:

```python
class ChatRequest(BaseModel):
    query: str
    user_id: str
    routing_choice: str = "local"
    config: dict | None = None
    messages: list[dict] | None = None
```

Update the endpoint to pass messages through:

```python
@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    result = await chat(req.query, req.user_id, req.routing_choice, req.config, req.messages)
    return ChatResponse(**result)
```

- [ ] **Step 5: Update chat() signature and use multi-turn prompt**

Modify `ai-sidecar/src/services/rag.py` — update the `chat()` function signature and prompt building:

```python
async def chat(query: str, user_id: str, routing_choice: str = "local", config: dict | None = None, messages: list[dict] | None = None) -> dict:
    raw_chunks = await retrieve_context(query, user_id, config=config)
    chunks = filter_chunks_by_similarity(raw_chunks)
    has_context = len(chunks) > 0

    if not has_context:
        mode_override = (config or {}).get("routing_mode")
        provider = sr.get_provider(False, mode_override=mode_override)
        if not mode_override:
            provider = routing_choice

        prompt = build_multi_turn_prompt(query, context=None, messages=messages)
        system = build_system_prompt(has_context=False)
        answer = await generate_text(prompt, system, provider, config)
        return {
            "answer": answer,
            "sources": [],
            "routed_to": provider,
            "has_sensitive_context": False,
        }

    # ... existing sensitive content logic stays the same ...

    context = "\n\n---\n\n".join(
        f"[{c.get('title', 'Unknown')}] ({c['entity_type']}):\n{c['chunk_text']}"
        for c in chunks
    )

    mode_override = (config or {}).get("routing_mode")
    provider = sr.get_provider(has_sensitive and routing_choice == "local", mode_override=mode_override)
    if not mode_override:
        provider = "local" if has_sensitive and routing_choice == "local" else routing_choice

    prompt = build_multi_turn_prompt(query, context, messages)
    system = build_system_prompt(has_context=True)
    answer = await generate_text(prompt, system, provider, config)

    # ... existing source dedup logic stays the same ...
```

- [ ] **Step 6: Run all rag tests**

Run: `cd ai-sidecar && python -m pytest tests/test_rag.py -v`
Expected: All 8 tests PASS

- [ ] **Step 7: Commit**

```bash
git add ai-sidecar/src/services/rag.py ai-sidecar/src/routes/chat.py ai-sidecar/tests/test_rag.py
git commit -m "feat(ai): multi-turn conversation context in chat

Accepts messages array with conversation history (last 10 messages).
Builds multi-turn prompt combining RAG context + history + new query."
```

---

## Task 3: Streaming LLM Generation (Sidecar)

**Files:**
- Create: `ai-sidecar/src/services/llm_stream.py`
- Create: `ai-sidecar/tests/test_llm_stream.py`

- [ ] **Step 1: Write tests for streaming generators**

Create `ai-sidecar/tests/test_llm_stream.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from services.llm_stream import format_sse_token, format_sse_sources, format_sse_done, format_sse_error


def test_format_sse_token():
    # #when
    result = format_sse_token("Hello")

    # #then
    assert result == 'event: token\ndata: {"text": "Hello"}\n\n'


def test_format_sse_token_with_special_chars():
    # #when
    result = format_sse_token('He said "hi"')

    # #then
    assert 'event: token' in result
    assert '"text": "He said \\"hi\\""' in result


def test_format_sse_sources():
    # #given
    sources = [{"type": "note", "id": "1", "title": "Test", "similarity": 0.8}]

    # #when
    result = format_sse_sources(sources, "cloud", False)

    # #then
    assert "event: sources" in result
    assert '"routed_to": "cloud"' in result
    assert '"has_sensitive_context": false' in result


def test_format_sse_done():
    # #when
    result = format_sse_done()

    # #then
    assert result == "event: done\ndata: {}\n\n"


def test_format_sse_error():
    # #when
    result = format_sse_error("Connection refused")

    # #then
    assert "event: error" in result
    assert "Connection refused" in result
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ai-sidecar && python -m pytest tests/test_llm_stream.py -v`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement streaming generators**

Create `ai-sidecar/src/services/llm_stream.py`:

```python
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


async def generate_text_stream(prompt: str, system: str, provider: str, config: dict | None = None) -> AsyncGenerator[str, None]:
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ai-sidecar && python -m pytest tests/test_llm_stream.py -v`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add ai-sidecar/src/services/llm_stream.py ai-sidecar/tests/test_llm_stream.py
git commit -m "feat(ai): streaming text generation for all LLM providers

Adds SSE-formatted streaming generators for Ollama, Anthropic, and
OpenAI-compatible providers. Includes SSE event formatting helpers."
```

---

## Task 4: Streaming RAG Chat + SSE Endpoint (Sidecar)

**Files:**
- Modify: `ai-sidecar/src/services/rag.py` (add `chat_stream`)
- Modify: `ai-sidecar/src/routes/chat.py` (add `/chat/stream` endpoint)

- [ ] **Step 1: Add chat_stream generator to rag.py**

Add to `ai-sidecar/src/services/rag.py` after the existing `chat()` function. Import at top:

```python
from services.llm_stream import generate_text_stream, format_sse_token, format_sse_sources, format_sse_done, format_sse_error
```

Then add the streaming chat function:

```python
async def chat_stream(query: str, user_id: str, routing_choice: str = "local", config: dict | None = None, messages: list[dict] | None = None) -> AsyncGenerator[str, None]:
    try:
        raw_chunks = await retrieve_context(query, user_id, config=config)
        chunks = filter_chunks_by_similarity(raw_chunks)
        has_context = len(chunks) > 0

        if not has_context:
            mode_override = (config or {}).get("routing_mode")
            provider = sr.get_provider(False, mode_override=mode_override)
            if not mode_override:
                provider = routing_choice

            prompt = build_multi_turn_prompt(query, context=None, messages=messages)
            system = build_system_prompt(has_context=False)

            async for token in generate_text_stream(prompt, system, provider, config):
                yield format_sse_token(token)

            yield format_sse_sources([], provider, False)
            yield format_sse_done()
            return

        has_sensitive = False
        pool = await get_pool()
        async with pool.acquire() as conn:
            for chunk in chunks:
                if chunk["entity_type"] == "note":
                    row = await conn.fetchrow(
                        "SELECT is_sensitive, title FROM notes WHERE id = $1::uuid",
                        chunk["entity_id"],
                    )
                else:
                    row = await conn.fetchrow(
                        "SELECT is_sensitive, TO_CHAR(date, 'YYYY-MM-DD') as title FROM journal_entries WHERE id = $1::uuid",
                        chunk["entity_id"],
                    )
                if row:
                    chunk["title"] = row["title"] or "Untitled"
                    if row["is_sensitive"]:
                        has_sensitive = True
                        chunk["is_sensitive"] = True

        if has_sensitive and routing_choice == "cloud":
            chunks = [c for c in chunks if not c.get("is_sensitive")]

        context = "\n\n---\n\n".join(
            f"[{c.get('title', 'Unknown')}] ({c['entity_type']}):\n{c['chunk_text']}"
            for c in chunks
        )

        mode_override = (config or {}).get("routing_mode")
        provider = sr.get_provider(has_sensitive and routing_choice == "local", mode_override=mode_override)
        if not mode_override:
            provider = "local" if has_sensitive and routing_choice == "local" else routing_choice

        prompt = build_multi_turn_prompt(query, context, messages)
        system = build_system_prompt(has_context=True)

        async for token in generate_text_stream(prompt, system, provider, config):
            yield format_sse_token(token)

        sources = []
        seen = set()
        for c in chunks:
            key = f"{c['entity_type']}:{c['entity_id']}"
            if key not in seen:
                seen.add(key)
                sources.append({
                    "type": c["entity_type"],
                    "id": str(c["entity_id"]),
                    "title": c.get("title", "Unknown"),
                    "similarity": float(c["similarity"]),
                })

        yield format_sse_sources(sources, provider, has_sensitive)
        yield format_sse_done()

    except Exception as e:
        yield format_sse_error(str(e))
```

Add the import at the top of the file:

```python
from typing import AsyncGenerator
```

- [ ] **Step 2: Add /chat/stream endpoint**

Modify `ai-sidecar/src/routes/chat.py`:

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.rag import chat, chat_stream

router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    user_id: str
    routing_choice: str = "local"
    config: dict | None = None
    messages: list[dict] | None = None


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
    result = await chat(req.query, req.user_id, req.routing_choice, req.config, req.messages)
    return ChatResponse(**result)


@router.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    return StreamingResponse(
        chat_stream(req.query, req.user_id, req.routing_choice, req.config, req.messages),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
```

- [ ] **Step 3: Run all sidecar tests**

Run: `cd ai-sidecar && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add ai-sidecar/src/services/rag.py ai-sidecar/src/routes/chat.py
git commit -m "feat(ai): SSE streaming endpoint for RAG chat

Adds /chat/stream endpoint that streams tokens via SSE events.
Sources and metadata sent as final events after content stream."
```

---

## Task 5: Streaming Relay in Next.js API Route

**Files:**
- Modify: `web/src/lib/ai-client.ts`
- Modify: `web/src/app/api/v1/ai/chat/route.ts`

- [ ] **Step 1: Add streamSidecar helper to ai-client.ts**

Modify `web/src/lib/ai-client.ts` — add streaming helper:

```typescript
const AI_SIDECAR_URL = process.env.AI_SIDECAR_URL ?? "http://localhost:8000";

export async function callSidecar<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AI_SIDECAR_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sidecar error (${res.status}): ${err}`);
  }

  return res.json();
}

export async function streamSidecar(path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${AI_SIDECAR_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sidecar error (${res.status}): ${err}`);
  }

  return res;
}
```

- [ ] **Step 2: Add streaming endpoint to chat route**

Modify `web/src/app/api/v1/ai/chat/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { streamSidecar } from "@/lib/ai-client";
import { badRequest, unauthorized } from "@/lib/api-response";
import { getUserAIConfig } from "@/lib/get-user-ai-settings";

const chatSchema = z.object({
  query: z.string().min(1),
  routingChoice: z.enum(["local", "cloud"]).default("local"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(10)
    .optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const aiConfig = await getUserAIConfig(user.id!);

  const sidecarRes = await streamSidecar("/chat/stream", {
    query: parsed.data.query,
    user_id: user.id!,
    routing_choice: parsed.data.routingChoice,
    messages: parsed.data.messages ?? null,
    config: {
      routing_mode: aiConfig.routingMode,
      api_key: aiConfig.anthropicApiKey,
      ollama_url: aiConfig.ollamaBaseUrl,
      chat_model_cloud: aiConfig.chatModelCloud,
      chat_model_local: aiConfig.chatModelLocal,
      cloud_provider: aiConfig.cloudProvider,
      openai_base_url: aiConfig.openaiBaseUrl,
      openai_api_key: aiConfig.openaiApiKey,
      openai_model: aiConfig.openaiModel,
    },
  });

  return new Response(sidecarRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/ai-client.ts web/src/app/api/v1/ai/chat/route.ts
git commit -m "feat(api): relay SSE stream from sidecar to client

Chat API route now streams SSE events from sidecar. Accepts optional
messages array (max 10) for multi-turn context."
```

---

## Task 6: SSE Reader Utility (Frontend)

**Files:**
- Create: `web/src/lib/sse-reader.ts`
- Create: `web/__tests__/lib/sse-reader.test.ts`

- [ ] **Step 1: Write tests for SSE reader**

Create `web/__tests__/lib/sse-reader.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseSSELine } from "@/lib/sse-reader";

describe("parseSSELine", () => {
  it("should parse token event", () => {
    // #given
    const lines = ['event: token', 'data: {"text": "Hello"}'];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result).toEqual({ event: "token", data: { text: "Hello" } });
  });

  it("should parse sources event", () => {
    // #given
    const lines = [
      "event: sources",
      'data: {"sources": [{"type": "note", "id": "1", "title": "Test", "similarity": 0.8}], "routed_to": "cloud", "has_sensitive_context": false}',
    ];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result?.event).toBe("sources");
    expect(result?.data.sources).toHaveLength(1);
  });

  it("should parse done event", () => {
    // #given
    const lines = ["event: done", "data: {}"];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result).toEqual({ event: "done", data: {} });
  });

  it("should parse error event", () => {
    // #given
    const lines = ["event: error", 'data: {"message": "Connection refused"}'];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result?.event).toBe("error");
    expect(result?.data.message).toBe("Connection refused");
  });

  it("should return null for empty lines", () => {
    // #when
    const result = parseSSELine([]);

    // #then
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run __tests__/lib/sse-reader.test.ts`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement SSE reader**

Create `web/src/lib/sse-reader.ts`:

```typescript
export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export function parseSSELine(lines: string[]): SSEEvent | null {
  if (lines.length === 0) return null;

  let event = "";
  let dataStr = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      event = line.slice(7);
    } else if (line.startsWith("data: ")) {
      dataStr = line.slice(6);
    }
  }

  if (!event || !dataStr) return null;

  try {
    return { event, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onSources: (sources: { type: string; id: string; title: string }[], routedTo: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function readSSEStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.split("\n").filter((l) => l.length > 0);
        const parsed = parseSSELine(lines);
        if (!parsed) continue;

        switch (parsed.event) {
          case "token":
            callbacks.onToken(parsed.data.text as string);
            break;
          case "sources":
            callbacks.onSources(
              parsed.data.sources as { type: string; id: string; title: string }[],
              parsed.data.routed_to as string
            );
            break;
          case "done":
            callbacks.onDone();
            break;
          case "error":
            callbacks.onError(parsed.data.message as string);
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run __tests__/lib/sse-reader.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/sse-reader.ts web/__tests__/lib/sse-reader.test.ts
git commit -m "feat(ui): SSE reader utility for streaming chat responses

Parses SSE events (token, sources, done, error) from ReadableStream.
Used by the chat hook to render streaming responses."
```

---

## Task 7: Streaming Chat Hook (Frontend)

**Files:**
- Modify: `web/src/hooks/use-ai-chat.ts:83-134` (sendMessage)

- [ ] **Step 1: Rewrite sendMessage to use streaming**

Replace the `sendMessage` function in `web/src/hooks/use-ai-chat.ts` (lines 83-134):

```typescript
const sendMessage = useCallback(async (query: string, routingChoice = "local") => {
  let convId = activeConversationId;
  if (!convId) {
    convId = await startNewConversation();
    if (!convId) return;
  }

  const userMsg: ChatMessage = { role: "user", content: query };
  setMessages((prev) => [...prev, userMsg]);
  setIsLoading(true);

  await fetch(`/api/v1/ai/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "user", content: query }),
  }).catch(() => {});

  const recentMessages = messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const assistantMsg: ChatMessage = { role: "assistant", content: "" };
  setMessages((prev) => [...prev, assistantMsg]);

  try {
    const res = await fetch("/api/v1/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, routingChoice, messages: recentMessages }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    await readSSEStream(res, {
      onToken: (text) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + text };
          }
          return updated;
        });
      },
      onSources: (sources) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, sources };
          }
          return updated;
        });
      },
      onDone: () => {},
      onError: (message) => {
        toast(message, "error");
      },
    });

    const finalMessages = messages;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last.content) {
        fetch(`/api/v1/ai/conversations/${convId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: last.content,
            sources: last.sources,
          }),
        }).catch(() => {});
      }
      return prev;
    });

    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  } catch {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant" && !last.content) {
        updated[updated.length - 1] = {
          ...last,
          content: "Failed to get a response. Please try again.",
        };
      }
      return updated;
    });
  } finally {
    setIsLoading(false);
  }
}, [activeConversationId, messages, startNewConversation, queryClient]);
```

Add the import at the top of the file:

```typescript
import { readSSEStream } from "@/lib/sse-reader";
```

- [ ] **Step 2: Build to check for type errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors related to use-ai-chat.ts

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/use-ai-chat.ts
git commit -m "feat(ui): streaming chat with multi-turn context

Chat hook now reads SSE stream for real-time token rendering and
sends last 10 messages for multi-turn conversation context."
```

---

## Task 8: Install Markdown Dependencies

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install react-markdown and rehype-highlight**

Run: `cd web && npm install react-markdown rehype-highlight`

- [ ] **Step 2: Verify install succeeded**

Run: `cd web && node -e "require('react-markdown'); require('rehype-highlight'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "deps: add react-markdown and rehype-highlight for chat rendering"
```

---

## Task 9: Markdown Renderer Component

**Files:**
- Create: `web/src/components/ai/chat-markdown.tsx`

- [ ] **Step 1: Create markdown renderer wrapper**

Create `web/src/components/ai/chat-markdown.tsx`:

```tsx
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

interface ChatMarkdownProps {
  content: string;
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 2: Add chat markdown styles**

Add to `web/src/app/globals.css` (at the end, before any closing brackets):

```css
.chat-markdown {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.chat-markdown p {
  margin: 0.4em 0;
}
.chat-markdown p:first-child {
  margin-top: 0;
}
.chat-markdown p:last-child {
  margin-bottom: 0;
}
.chat-markdown ul,
.chat-markdown ol {
  margin: 0.4em 0;
  padding-left: 1.5em;
}
.chat-markdown li {
  margin: 0.2em 0;
}
.chat-markdown code {
  font-size: 12px;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: var(--surface);
}
.chat-markdown pre {
  margin: 0.5em 0;
  padding: 0.75em 1em;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  overflow-x: auto;
}
.chat-markdown pre code {
  padding: 0;
  background: none;
  font-size: 12px;
}
.chat-markdown strong {
  color: var(--text-primary);
}
.chat-markdown a {
  color: var(--accent);
  text-decoration: underline;
}
.chat-markdown h1,
.chat-markdown h2,
.chat-markdown h3 {
  color: var(--text-primary);
  margin: 0.6em 0 0.3em;
  font-weight: 600;
}
.chat-markdown h1 { font-size: 1.2em; }
.chat-markdown h2 { font-size: 1.1em; }
.chat-markdown h3 { font-size: 1em; }
.chat-markdown table {
  border-collapse: collapse;
  margin: 0.5em 0;
  font-size: 12px;
}
.chat-markdown th,
.chat-markdown td {
  border: 1px solid var(--border);
  padding: 0.3em 0.6em;
}
.chat-markdown th {
  background: var(--surface);
  font-weight: 600;
}
.chat-markdown blockquote {
  border-left: 3px solid var(--accent);
  margin: 0.5em 0;
  padding-left: 0.75em;
  color: var(--text-muted);
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ai/chat-markdown.tsx web/src/app/globals.css
git commit -m "feat(ui): markdown renderer for chat assistant messages

Renders markdown with syntax-highlighted code blocks using lowlight.
Styled to match the dark-first theme."
```

---

## Task 10: Update ChatMessage — Markdown + Copy Button

**Files:**
- Modify: `web/src/components/ai/chat-message.tsx`

- [ ] **Step 1: Rewrite ChatMessage with markdown rendering and copy button**

Replace the entire `web/src/components/ai/chat-message.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { ChatMarkdown } from "./chat-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`mb-4 fade-in ${role === "user" ? "flex justify-end" : ""}`}>
      <div
        className="group relative inline-block max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
        style={
          role === "user"
            ? { background: "var(--gradient-accent)", color: "white", borderBottomRightRadius: "4px" }
            : { backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderBottomLeftRadius: "4px" }
        }
      >
        {role === "assistant" && content && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            style={{ color: "var(--text-faint)", backgroundColor: "var(--background)" }}
            aria-label="Copy message"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
        {role === "assistant" ? (
          <ChatMarkdown content={content} />
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sources.map((s) => {
            const href = s.type === "note" ? `/notes/${s.id}` : `/journal/${s.title}`;
            return (
              <Link
                key={`${s.type}-${s.id}`}
                href={href}
                className="rounded-md px-2 py-0.5 text-[11px] transition-colors duration-150"
                style={{
                  backgroundColor: "var(--accent-muted)",
                  color: "var(--accent)",
                  border: "1px solid rgba(217,119,6,0.2)",
                }}
              >
                {s.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build to check for type errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ai/chat-message.tsx
git commit -m "feat(ui): markdown rendering + copy button for chat messages

Assistant messages now render as rich markdown with syntax highlighting.
Copy button appears on hover to copy raw content to clipboard."
```

---

## Task 11: Update ChatPanel for Streaming UX

**Files:**
- Modify: `web/src/components/ai/chat-panel.tsx:110-121` (message rendering area)

- [ ] **Step 1: Update chat panel to handle partial messages during streaming**

The `ChatPanel` already renders messages from state, and the streaming hook updates the last message incrementally, so the panel will auto-render partial content. The main change needed: hide the loading dots when streaming is in progress (the content itself serves as the indicator).

Modify `web/src/components/ai/chat-panel.tsx` — replace the loading indicator section (lines 113-121):

```tsx
{isLoading && messages[messages.length - 1]?.role !== "assistant" && (
  <div className="text-sm" style={{ color: "var(--text-faint)" }}>
    <span className="inline-flex gap-1">
      <span className="animate-pulse">.</span>
      <span className="animate-pulse" style={{ animationDelay: "150ms" }}>.</span>
      <span className="animate-pulse" style={{ animationDelay: "300ms" }}>.</span>
    </span>
  </div>
)}
```

This shows the animated dots only during the brief period between sending and the first token arriving (when the last message is still the user's message, not the placeholder assistant message).

- [ ] **Step 2: Build to check for type errors**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ai/chat-panel.tsx
git commit -m "fix(ui): hide loading dots once streaming tokens arrive

Loading dots only show between send and first token. Once the
assistant message placeholder exists, the streaming content is visible."
```

---

## Task 12: Full Build Verification + Docker Rebuild

**Files:** None (verification only)

- [ ] **Step 1: Run all frontend tests**

Run: `cd web && npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run frontend build**

Run: `cd web && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run all sidecar tests**

Run: `cd ai-sidecar && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 4: Docker rebuild**

Run: `docker-compose up -d --build web ai-sidecar`
Expected: Both containers start and become healthy

- [ ] **Step 5: Manual smoke test**

1. Open `http://localhost:3001`, navigate to AI Chat
2. Send: "What did I write about recently?" — verify tokens stream in real-time, sources appear after stream
3. Send follow-up: "Tell me more about the first one" — verify it references the previous answer
4. Send unrelated: "What is the speed of light?" — verify "didn't find relevant notes" disclaimer
5. Hover over assistant message — verify copy button appears, click it, paste somewhere to confirm
6. Verify code blocks render with syntax highlighting (ask: "Show me an example Python function")

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
