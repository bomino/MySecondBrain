import { NextRequest } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const deleteSchema = z.object({
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return badRequest("Password is required");

  const dbUser = await db.user.findUnique({ where: { id: user.id! } });
  if (!dbUser) return unauthorized();

  const valid = await compare(parsed.data.password, dbUser.passwordHash);
  if (!valid) return badRequest("Incorrect password");

  const userId = user.id!;

  const noteIds = (await db.note.findMany({ where: { userId }, select: { id: true } })).map((n) => n.id);
  const entryIds = (await db.journalEntry.findMany({ where: { userId }, select: { id: true } })).map((e) => e.id);

  await db.$transaction([
    db.chatMessage.deleteMany({ where: { conversation: { userId } } }),
    db.chatConversation.deleteMany({ where: { userId } }),
    db.aIJobLog.deleteMany({ where: { userId } }),
    ...(noteIds.length > 0 ? [db.embeddingChunk.deleteMany({ where: { entityType: "note", entityId: { in: noteIds } } })] : []),
    ...(entryIds.length > 0 ? [db.embeddingChunk.deleteMany({ where: { entityType: "journal_entry", entityId: { in: entryIds } } })] : []),
    db.noteLink.deleteMany({ where: { source: { userId } } }),
    db.taggable.deleteMany({ where: { tag: { userId } } }),
    db.noteTemplate.deleteMany({ where: { userId } }),
    db.tag.deleteMany({ where: { userId } }),
    db.journalEntry.deleteMany({ where: { userId } }),
    db.note.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);

  return success({ deleted: true });
}
