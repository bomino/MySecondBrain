import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, notFound, unauthorized } from "@/lib/api-response";

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateTagSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const existing = await db.tag.findFirst({ where: { id, userId: user.id! } });
  if (!existing) return notFound("Tag");

  const tag = await db.tag.update({ where: { id }, data: parsed.data });
  return success(tag);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const existing = await db.tag.findFirst({ where: { id, userId: user.id! } });
  if (!existing) return notFound("Tag");

  await db.taggable.deleteMany({ where: { tagId: id } });
  await db.tag.delete({ where: { id } });

  return success({ deleted: true });
}
