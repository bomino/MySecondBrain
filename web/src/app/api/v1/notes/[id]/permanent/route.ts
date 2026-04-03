import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const note = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: { not: null } },
  });
  if (!note) return notFound("Deleted note");

  await db.$transaction([
    db.embeddingChunk.deleteMany({ where: { entityType: "note", entityId: id } }),
    db.taggable.deleteMany({ where: { entityType: "note", entityId: id } }),
    db.noteLink.deleteMany({ where: { OR: [{ sourceId: id }, { targetId: id }] } }),
    db.note.delete({ where: { id } }),
  ]);

  return success({ deleted: true });
}
