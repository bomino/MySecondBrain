import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ date: string }> };

export async function PUT(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { date } = await params;

  const entry = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: { not: null } },
  });
  if (!entry) return notFound("Deleted journal entry");

  await db.journalEntry.update({ where: { id: entry.id }, data: { deletedAt: null } });
  return success({ restored: true });
}
