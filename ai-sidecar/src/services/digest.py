import numpy as np
from datetime import datetime, timedelta
from db import get_pool
from pgvector.asyncpg import register_vector


async def generate_digest(user_id: str) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await register_vector(conn)

        forgotten = await _forgotten_relevance(conn, user_id)
        on_this_day = await _on_this_day(conn, user_id)
        orphans = await _orphan_detection(conn, user_id)
        clusters = await _cluster_alerts(conn, user_id)

    return {
        "forgotten_relevance": forgotten,
        "on_this_day": on_this_day,
        "orphans": orphans,
        "clusters": clusters,
        "generated_at": datetime.utcnow().isoformat(),
    }


async def _forgotten_relevance(conn, user_id: str) -> list[dict]:
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    recent_embedding = await conn.fetchrow(
        """
        SELECT ec.embedding FROM embedding_chunks ec
        JOIN notes n ON ec.entity_id = n.id AND ec.entity_type = 'note'
        WHERE n.user_id = $1::uuid AND n.deleted_at IS NULL
          AND n.updated_at > $2
        ORDER BY n.updated_at DESC
        LIMIT 1
        """,
        user_id,
        seven_days_ago,
    )

    if not recent_embedding or recent_embedding["embedding"] is None:
        return []

    rows = await conn.fetch(
        """
        SELECT * FROM (
            SELECT DISTINCT ON (n.id) n.id, n.title,
                   1 - (ec.embedding <=> $1::vector) as similarity
            FROM notes n
            JOIN embedding_chunks ec ON ec.entity_id = n.id AND ec.entity_type = 'note'
            WHERE n.user_id = $2::uuid
              AND n.deleted_at IS NULL
              AND (n.last_viewed_at IS NULL OR n.last_viewed_at < $3)
              AND n.updated_at < $3
            ORDER BY n.id, ec.embedding <=> $1::vector
        ) sub
        ORDER BY similarity DESC
        LIMIT 5
        """,
        np.array(recent_embedding["embedding"], dtype=np.float32),
        user_id,
        thirty_days_ago,
    )

    return [
        {"id": str(r["id"]), "title": r["title"] or "Untitled", "similarity": float(r["similarity"])}
        for r in rows
    ]


async def _on_this_day(conn, user_id: str) -> list[dict]:
    today = datetime.utcnow()
    rows = await conn.fetch(
        """
        SELECT id, date, LEFT(content_plain, 150) as snippet
        FROM journal_entries
        WHERE user_id = $1::uuid
          AND deleted_at IS NULL
          AND EXTRACT(MONTH FROM date) = $2
          AND EXTRACT(DAY FROM date) = $3
          AND EXTRACT(YEAR FROM date) < $4
        ORDER BY date DESC
        LIMIT 5
        """,
        user_id,
        today.month,
        today.day,
        today.year,
    )

    return [
        {"id": str(r["id"]), "date": r["date"].isoformat(), "snippet": r["snippet"] or ""}
        for r in rows
    ]


async def _orphan_detection(conn, user_id: str) -> list[dict]:
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)

    rows = await conn.fetch(
        """
        SELECT n.id, n.title, n.created_at
        FROM notes n
        WHERE n.user_id = $1::uuid
          AND n.deleted_at IS NULL
          AND n.created_at < $2
          AND NOT EXISTS (
            SELECT 1 FROM taggables t WHERE t.entity_type = 'note' AND t.entity_id = n.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM note_links nl WHERE nl.source_id = n.id OR nl.target_id = n.id
          )
        ORDER BY n.created_at DESC
        LIMIT 10
        """,
        user_id,
        fourteen_days_ago,
    )

    return [
        {"id": str(r["id"]), "title": r["title"] or "Untitled", "created_at": r["created_at"].isoformat()}
        for r in rows
    ]


async def _cluster_alerts(conn, user_id: str) -> list[dict]:
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)

    rows = await conn.fetch(
        """
        SELECT DISTINCT ON (n.id) n.id, n.title, ec.embedding
        FROM notes n
        JOIN embedding_chunks ec ON ec.entity_id = n.id AND ec.entity_type = 'note'
        WHERE n.user_id = $1::uuid
          AND n.deleted_at IS NULL
          AND n.created_at > $2
          AND ec.embedding IS NOT NULL
        ORDER BY n.id, ec.chunk_index
        """,
        user_id,
        fourteen_days_ago,
    )

    if len(rows) < 3:
        return []

    linked_pairs = set()
    link_rows = await conn.fetch(
        """
        SELECT nl.source_id, nl.target_id FROM note_links nl
        JOIN notes n ON nl.source_id = n.id
        WHERE n.user_id = $1::uuid
        """,
        user_id,
    )
    for lr in link_rows:
        linked_pairs.add((str(lr["source_id"]), str(lr["target_id"])))
        linked_pairs.add((str(lr["target_id"]), str(lr["source_id"])))

    clusters = []
    used = set()

    for i, row_a in enumerate(rows):
        if str(row_a["id"]) in used:
            continue
        cluster = [{"id": str(row_a["id"]), "title": row_a["title"] or "Untitled"}]

        for j, row_b in enumerate(rows):
            if i == j or str(row_b["id"]) in used:
                continue
            pair = (str(row_a["id"]), str(row_b["id"]))
            if pair in linked_pairs:
                continue

            emb_a = row_a["embedding"]
            emb_b = row_b["embedding"]
            if emb_a is not None and emb_b is not None:
                from numpy import dot
                from numpy.linalg import norm
                a = list(emb_a)
                b = list(emb_b)
                sim = dot(a, b) / (norm(a) * norm(b) + 1e-8)
                if sim > 0.8:
                    cluster.append({"id": str(row_b["id"]), "title": row_b["title"] or "Untitled"})
                    used.add(str(row_b["id"]))

        if len(cluster) >= 3:
            used.add(str(row_a["id"]))
            clusters.append(cluster)

    return clusters[:3]
