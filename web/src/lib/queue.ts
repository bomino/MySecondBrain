import Redis from "ioredis";
import { db } from "./db";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

const QUEUE_KEY = "ai:jobs";
const DEBOUNCE_PREFIX = "ai:debounce:";
const DEBOUNCE_SECONDS = 300;

export async function enqueueAIJob(
  userId: string,
  entityType: string,
  entityId: string,
  jobType: string,
  payload: Record<string, unknown>
) {
  const debounceKey = `${DEBOUNCE_PREFIX}${entityType}:${entityId}:${jobType}`;
  const existing = await redis.get(debounceKey);
  if (existing) return;

  await redis.setex(debounceKey, DEBOUNCE_SECONDS, "1");

  await db.aIJobLog.create({
    data: {
      userId,
      entityType,
      entityId,
      jobType,
      status: "queued",
    },
  });

  await redis.lpush(
    QUEUE_KEY,
    JSON.stringify({
      type: jobType,
      entity_type: entityType,
      entity_id: entityId,
      ...payload,
    })
  );
}
