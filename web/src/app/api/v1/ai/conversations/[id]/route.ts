import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized, badRequest } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const conversation = await db.chatConversation.findFirst({
    where: { id, userId: user.id! },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) return notFound("Conversation");
  return success(conversation);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const existing = await db.chatConversation.findFirst({ where: { id, userId: user.id! } });
  if (!existing) return notFound("Conversation");

  await db.chatConversation.delete({ where: { id } });
  return success({ deleted: true });
}

const renameSchema = z.object({
  title: z.string().min(1).max(100),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const existing = await db.chatConversation.findFirst({ where: { id, userId: user.id! } });
  if (!existing) return notFound("Conversation");

  const body = await req.json();
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid title", parsed.error.flatten());

  const updated = await db.chatConversation.update({
    where: { id },
    data: { title: parsed.data.title },
  });

  return success(updated);
}
