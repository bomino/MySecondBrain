import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const template = await db.noteTemplate.findFirst({ where: { id, userId: user.id! } });
  if (!template) return notFound("Template");

  return success(template);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const existing = await db.noteTemplate.findFirst({ where: { id, userId: user.id! } });
  if (!existing) return notFound("Template");

  await db.noteTemplate.delete({ where: { id } });
  return success({ deleted: true });
}
