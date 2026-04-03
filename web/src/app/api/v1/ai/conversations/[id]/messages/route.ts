import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, notFound, unauthorized } from "@/lib/api-response";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sources: z.any().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const conversation = await db.chatConversation.findFirst({ where: { id, userId: user.id! } });
  if (!conversation) return notFound("Conversation");

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid message", parsed.error.flatten());

  const message = await db.chatMessage.create({
    data: {
      conversationId: id,
      role: parsed.data.role,
      content: parsed.data.content,
      sources: parsed.data.sources ?? null,
    },
  });

  if (parsed.data.role === "user" && conversation.title === "New conversation") {
    await db.chatConversation.update({
      where: { id },
      data: { title: parsed.data.content.slice(0, 50) },
    });
  }

  return success(message, 201);
}
