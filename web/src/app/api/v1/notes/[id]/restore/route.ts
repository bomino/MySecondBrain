import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const note = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: { not: null } },
  });
  if (!note) return notFound("Deleted note");

  await db.note.update({ where: { id }, data: { deletedAt: null } });
  return success({ restored: true });
}
