from pgvector.asyncpg import register_vector
from db import get_pool
from services.llm import generate_embedding, generate_text
from services.sensitivity_router import SensitivityRouter
from config import settings

sr = SensitivityRouter(mode=settings.ai_routing_mode)

SYSTEM_PROMPT = """You are a personal knowledge assistant. Answer questions using ONLY the provided context from the user's notes and journal.

Rules:
- Cite sources by their title or date in [brackets]
- If the context doesn't contain enough information, say so
- Be concise and direct
- Never make up information not present in the context"""


async def retrieve_context(query: str, user_id: str, top_k: int = 10) -> list[dict]:
    embedding = await generate_embedding(query, "local")

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
            str(embedding),
            user_id,
            top_k,
        )

    return [dict(row) for row in rows]


async def chat(query: str, user_id: str, routing_choice: str = "local") -> dict:
    chunks = await retrieve_context(query, user_id)

    if not chunks:
        return {
            "answer": "I don't have enough information in your knowledge base to answer this question.",
            "sources": [],
            "routed_to": routing_choice,
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

    provider = "local" if has_sensitive and routing_choice == "local" else routing_choice
    prompt = f"Context from knowledge base:\n\n{context}\n\n---\n\nQuestion: {query}"

    answer = await generate_text(prompt, SYSTEM_PROMPT, provider)

    sources = []
    seen = set()
    for c in chunks:
        key = f"{c['entity_type']}:{c['entity_id']}"
        if key not in seen:
            seen.add(key)
            sources.append({
                "type": c["entity_type"],
                "id": c["entity_id"],
                "title": c.get("title", "Unknown"),
                "similarity": float(c["similarity"]),
            })

    return {
        "answer": answer,
        "sources": sources,
        "routed_to": provider,
        "has_sensitive_context": has_sensitive,
    }
