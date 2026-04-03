import asyncio
import json
import redis.asyncio as redis
from config import settings
from services.embedding import embed_entity
from db import get_pool

QUEUE_KEY = "ai:jobs"
DEBOUNCE_KEY_PREFIX = "ai:debounce:"
DEBOUNCE_SECONDS = 300


async def process_job(job_data: dict):
    job_type = job_data["type"]

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE ai_job_logs SET status = 'processing'
            WHERE entity_type = $1 AND entity_id = $2::uuid AND job_type = $3 AND status = 'queued'
            """,
            job_data.get("entity_type", ""),
            job_data.get("entity_id", ""),
            job_type,
        )

    if job_type == "embed":
        await embed_entity(
            entity_type=job_data["entity_type"],
            entity_id=job_data["entity_id"],
            text=job_data["text"],
            is_sensitive=job_data.get("is_sensitive", False),
        )
    elif job_type == "auto_tag":
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://ai-sidecar:8000/auto-tag",
                json={
                    "text": job_data.get("text", ""),
                    "is_sensitive": job_data.get("is_sensitive", False),
                    "existing_tags": [],
                },
                timeout=60.0,
            )
            resp.raise_for_status()
            result = resp.json()

        pool = await get_pool()
        async with pool.acquire() as conn:
            import json as json_mod
            await conn.execute(
                """
                UPDATE ai_job_logs SET status = 'pending_review', result = $4::jsonb, completed_at = NOW()
                WHERE entity_type = $1 AND entity_id = $2::uuid AND job_type = $3 AND status = 'processing'
                """,
                job_data["entity_type"],
                job_data["entity_id"],
                "auto_tag",
                json_mod.dumps(result),
            )
        return

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE ai_job_logs SET status = 'completed', completed_at = NOW()
            WHERE entity_type = $1 AND entity_id = $2::uuid AND job_type = $3 AND status = 'processing'
            """,
            job_data["entity_type"],
            job_data["entity_id"],
            job_type,
        )


async def run_worker():
    r = redis.from_url(settings.redis_url)

    while True:
        result = await r.brpop(QUEUE_KEY, timeout=5)
        if result is None:
            continue

        _, raw = result
        job_data = json.loads(raw)

        try:
            await process_job(job_data)
        except Exception as e:
            pool = await get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE ai_job_logs SET status = 'failed', error = $4, completed_at = NOW()
                    WHERE entity_type = $1 AND entity_id = $2::uuid AND job_type = $3 AND status = 'processing'
                    """,
                    job_data.get("entity_type", ""),
                    job_data.get("entity_id", ""),
                    job_data.get("type", ""),
                    str(e),
                )


if __name__ == "__main__":
    asyncio.run(run_worker())
