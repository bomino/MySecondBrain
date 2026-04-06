import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { notFound, unauthorized, badRequest } from "@/lib/api-response";

type Params = { params: Promise<{ id: string; messageId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id, messageId } = await params;

  const conversation = await db.chatConversation.findFirst({ where: { id, userId: user.id! } });
  if (!conversation) return notFound("Conversation");

  const message = await db.chatMessage.findFirst({
    where: { id: messageId, conversationId: id },
  });
  if (!message) return notFound("Message");

  if (message.role !== "assistant") {
    return badRequest("Only assistant messages can be deleted for regeneration");
  }

  await db.chatMessage.delete({ where: { id: messageId } });
  return new Response(null, { status: 204 });
}
