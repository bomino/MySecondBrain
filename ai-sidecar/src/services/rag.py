import logging
import numpy as np
from pgvector.asyncpg import register_vector
from db import get_pool
from typing import AsyncGenerator
from services.llm import generate_embedding, generate_text
from services.llm_stream import generate_text_stream, format_sse_token, format_sse_sources, format_sse_done, format_sse_error, format_sse_suggestions
from services.sensitivity_router import SensitivityRouter
from config import settings

logger = logging.getLogger(__name__)

sr = SensitivityRouter(mode=settings.ai_routing_mode)

MIN_SIMILARITY_THRESHOLD = 0.3

SYSTEM_PROMPT = """You are a personal knowledge assistant. Answer questions using ONLY the provided context from the user's notes and journal.

Rules:
- Cite sources by their title or date in [brackets]
- If the context doesn't contain enough information, say so
- Be concise and direct
- Never make up information not present in the context"""

NO_CONTEXT_SYSTEM_PROMPT = """You are a personal knowledge assistant. The user's knowledge base did not contain relevant information for this query. You may answer from your general knowledge, but preface your answer with a brief note that you didn't find relevant notes in their knowledge base.

Rules:
- Be concise and direct
- Never make up information
- Clearly indicate this is general knowledge, not from their notes"""

FOLLOWUP_PROMPT = """Based on the answer you just gave and the context provided, suggest exactly 3 short follow-up questions the user might ask next. Return ONLY the questions, one per line, no numbering or bullets."""


def filter_chunks_by_similarity(chunks: list[dict]) -> list[dict]:
    return [c for c in chunks if c.get("similarity", 0) >= MIN_SIMILARITY_THRESHOLD]


def build_system_prompt(has_context: bool) -> str:
    if has_context:
        return SYSTEM_PROMPT
    return NO_CONTEXT_SYSTEM_PROMPT


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


async def _generate_followups(answer: str, query: str, provider: str, config: dict | None = None) -> list[str]:
    try:
        prompt = f"User asked: {query}\n\nYour answer: {answer[:500]}\n\n{FOLLOWUP_PROMPT}"
        raw = await generate_text(prompt, "You are a helpful assistant.", provider, config)
        lines = [line.strip() for line in raw.strip().split("\n") if line.strip()]
        return lines[:3]
    except Exception:
        logger.warning("Failed to generate follow-up suggestions")
        return []


async def retrieve_context(query: str, user_id: str, top_k: int = 10, config: dict | None = None) -> list[dict]:
    embedding = await generate_embedding(query, "local", config)

    pool = await get_pool()
    async with pool.acquire() as conn:
        await register_vector(conn)

        rows = await conn.fetch(
            """
            SELECT ec.entity_type, ec.entity_id, ec.chunk_text,
                   1 - (ec.embedding <=> $1::vector) as similarity
            FROM embedding_chunks ec
            JOIN (
                SELECT id, user_id, is_sensitive, 'note' as src FROM notes WHERE user_id = $2::uuid AND deleted_at IS NULL
                UNION ALL
                SELECT id, user_id, is_sensitive, 'journal_entry' as src FROM journal_entries WHERE user_id = $2::uuid AND deleted_at IS NULL
            ) entities ON ec.entity_id = entities.id AND ec.entity_type = entities.src
            WHERE entities.user_id = $2::uuid
            ORDER BY ec.embedding <=> $1::vector
            LIMIT $3
            """,
            np.array(embedding, dtype=np.float32),
            user_id,
            top_k,
        )

    return [dict(row) for row in rows]


async def chat(query: str, user_id: str, routing_choice: str = "local", config: dict | None = None, messages: list[dict] | None = None) -> dict:
    raw_chunks = await retrieve_context(query, user_id, config=config)
    chunks = filter_chunks_by_similarity(raw_chunks)

    has_context = len(chunks) > 0

    if not has_context:
        mode_override = (config or {}).get("routing_mode")
        provider = sr.get_provider(False, mode_override=mode_override)
        if not mode_override:
            provider = routing_choice

        system_prompt = build_system_prompt(has_context=False)
        prompt = build_multi_turn_prompt(query, context=None, messages=messages)
        answer = await generate_text(prompt, system_prompt, provider, config)

        return {
            "answer": answer,
            "sources": [],
            "routed_to": provider,
        }

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

    system_prompt = build_system_prompt(has_context=True)
    prompt = build_multi_turn_prompt(query, context, messages)
    answer = await generate_text(prompt, system_prompt, provider, config)

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

    return {
        "answer": answer,
        "sources": sources,
        "routed_to": provider,
        "has_sensitive_context": has_sensitive,
    }


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

            collected_answer = []
            async for token in generate_text_stream(prompt, system, provider, config):
                collected_answer.append(token)
                yield format_sse_token(token)

            yield format_sse_sources([], provider, False)

            followups = await _generate_followups("".join(collected_answer), query, provider, config)
            if followups:
                yield format_sse_suggestions(followups)

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

        collected_answer = []
        async for token in generate_text_stream(prompt, system, provider, config):
            collected_answer.append(token)
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

        followups = await _generate_followups("".join(collected_answer), query, provider, config)
        if followups:
            yield format_sse_suggestions(followups)

        yield format_sse_done()

    except Exception as e:
        logger.exception("chat_stream failed")
        yield format_sse_error("An error occurred while generating a response. Please try again.")
