import tiktoken
from pgvector.asyncpg import register_vector
from config import settings
from db import get_pool
from services.llm import generate_embedding
from services.sensitivity_router import SensitivityRouter

router = SensitivityRouter(mode=settings.ai_routing_mode)
enc = tiktoken.get_encoding("cl100k_base")


def chunk_text(text: str, chunk_size: int = settings.chunk_size, overlap: int = settings.chunk_overlap) -> list[str]:
    tokens = enc.encode(text)
    if len(tokens) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunks.append(enc.decode(chunk_tokens))
        start = end - overlap

    return chunks


async def embed_entity(entity_type: str, entity_id: str, text: str, is_sensitive: bool) -> int:
    provider = router.get_provider(is_sensitive)
    chunks = chunk_text(text)

    pool = await get_pool()
    async with pool.acquire() as conn:
        await register_vector(conn)

        await conn.execute(
            "DELETE FROM embedding_chunks WHERE entity_type = $1 AND entity_id = $2::uuid",
            entity_type,
            entity_id,
        )

        for i, chunk in enumerate(chunks):
            embedding = await generate_embedding(chunk, provider)
            await conn.execute(
                """
                INSERT INTO embedding_chunks (id, entity_type, entity_id, chunk_index, chunk_text, embedding, created_at)
                VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5::vector, NOW())
                """,
                entity_type,
                entity_id,
                i,
                chunk,
                str(embedding),
            )

    return len(chunks)
