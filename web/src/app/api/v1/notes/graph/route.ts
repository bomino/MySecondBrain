import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const notes = await db.note.findMany({
    where: { userId: user.id!, deletedAt: null },
    select: { id: true, title: true },
  });

  const links = await db.noteLink.findMany({
    where: {
      source: { userId: user.id!, deletedAt: null },
      target: { deletedAt: null },
    },
    select: { sourceId: true, targetId: true },
  });

  return success({
    nodes: notes.map((n) => ({ id: n.id, label: n.title || "Untitled" })),
    edges: links.map((l) => ({ source: l.sourceId, target: l.targetId })),
  });
}
