import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";

  const where: Record<string, unknown> = { userId: user.id! };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { messages: { some: { content: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const conversations = await db.chatConversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
    take: 50,
  });

  return success(conversations);
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const body = await req.json().catch(() => ({}));
  const conversation = await db.chatConversation.create({
    data: {
      userId: user.id!,
      title: body.title ?? "New conversation",
    },
  });

  return success(conversation, 201);
}

export async function DELETE(_req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const count = await db.chatConversation.count({ where: { userId: user.id! } });

  await db.chatMessage.deleteMany({
    where: { conversation: { userId: user.id! } },
  });
  await db.chatConversation.deleteMany({ where: { userId: user.id! } });

  return success({ deleted: count });
}
