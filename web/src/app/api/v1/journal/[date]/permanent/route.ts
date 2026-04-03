import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ date: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { date } = await params;

  const entry = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: { not: null } },
  });
  if (!entry) return notFound("Deleted journal entry");

  await db.$transaction([
    db.embeddingChunk.deleteMany({ where: { entityType: "journal_entry", entityId: entry.id } }),
    db.taggable.deleteMany({ where: { entityType: "journal_entry", entityId: entry.id } }),
    db.journalEntry.delete({ where: { id: entry.id } }),
  ]);

  return success({ deleted: true });
}
