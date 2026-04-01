import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const note = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
  });
  if (!note) return notFound("Note");

  const outgoing = await db.noteLink.findMany({
    where: { sourceId: id },
    select: {
      target: { select: { id: true, title: true } },
    },
  });

  const incoming = await db.noteLink.findMany({
    where: { targetId: id },
    select: {
      source: { select: { id: true, title: true } },
    },
  });

  return success({
    outgoing: outgoing.map((l) => l.target),
    incoming: incoming.map((l) => l.source),
  });
}
