from fastapi import APIRouter
from pydantic import BaseModel
from pgvector.asyncpg import register_vector
from db import get_pool

router = APIRouter()


class RelatedRequest(BaseModel):
    entity_type: str
    entity_id: str
    user_id: str
    top_k: int = 5


class RelatedItem(BaseModel):
    entity_type: str
    entity_id: str
    similarity: float


class RelatedResponse(BaseModel):
    items: list[RelatedItem]


@router.post("/related", response_model=RelatedResponse)
async def get_related(req: RelatedRequest):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await register_vector(conn)

        source_embedding = await conn.fetchrow(
            """
            SELECT embedding FROM embedding_chunks
            WHERE entity_type = $1 AND entity_id = $2::uuid
            ORDER BY chunk_index ASC
            LIMIT 1
            """,
            req.entity_type,
            req.entity_id,
        )

        if not source_embedding or source_embedding["embedding"] is None:
            return RelatedResponse(items=[])

        rows = await conn.fetch(
            """
            SELECT DISTINCT ON (ec.entity_type, ec.entity_id)
                ec.entity_type, ec.entity_id,
                1 - (ec.embedding <=> $1::vector) as similarity
            FROM embedding_chunks ec
            JOIN (
                SELECT id, user_id, 'note' as src FROM notes WHERE user_id = $2::uuid AND deleted_at IS NULL
                UNION ALL
                SELECT id, user_id, 'journal_entry' as src FROM journal_entries WHERE user_id = $2::uuid AND deleted_at IS NULL
            ) entities ON ec.entity_id = entities.id AND ec.entity_type = entities.src
            WHERE entities.user_id = $2::uuid
              AND NOT (ec.entity_type = $3 AND ec.entity_id = $4::uuid)
            ORDER BY ec.entity_type, ec.entity_id, ec.embedding <=> $1::vector
            LIMIT $5
            """,
            str(source_embedding["embedding"]),
            req.user_id,
            req.entity_type,
            req.entity_id,
            req.top_k * 3,
        )

        items = sorted(
            [RelatedItem(entity_type=r["entity_type"], entity_id=str(r["entity_id"]), similarity=float(r["similarity"])) for r in rows],
            key=lambda x: -x.similarity,
        )[:req.top_k]

        return RelatedResponse(items=items)
