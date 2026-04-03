import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const job = await db.aIJobLog.findFirst({
    where: { id, userId: user.id!, status: "pending_review" },
  });
  if (!job) return notFound("Suggestion");

  const result = job.result as { suggested_tags?: string[] } | null;
  const suggestedTags = result?.suggested_tags ?? [];

  for (const tagName of suggestedTags) {
    let tag = await db.tag.findFirst({
      where: { userId: user.id!, name: tagName },
    });
    if (!tag) {
      tag = await db.tag.create({
        data: { userId: user.id!, name: tagName, color: "#d97706" },
      });
    }

    await db.taggable.upsert({
      where: {
        tagId_entityType_entityId: {
          tagId: tag.id,
          entityType: job.entityType,
          entityId: job.entityId,
        },
      },
      create: {
        tagId: tag.id,
        entityType: job.entityType,
        entityId: job.entityId,
      },
      update: {},
    });
  }

  await db.aIJobLog.update({ where: { id }, data: { status: "accepted" } });

  return success({ accepted: true, tagsApplied: suggestedTags });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const job = await db.aIJobLog.findFirst({
    where: { id, userId: user.id!, status: "pending_review" },
  });
  if (!job) return notFound("Suggestion");

  await db.aIJobLog.update({ where: { id }, data: { status: "rejected" } });

  return success({ rejected: true });
}
