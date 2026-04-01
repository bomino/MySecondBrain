import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, notFound, unauthorized, badRequest } from "@/lib/api-response";

type Params = { params: Promise<{ type: string; id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { type, id } = await params;

  let text = "";
  let isSensitive = false;

  if (type === "note") {
    const note = await db.note.findFirst({
      where: { id, userId: user.id!, deletedAt: null },
    });
    if (!note) return notFound("Note");
    text = `${note.title}\n${note.contentPlain}`;
    isSensitive = note.isSensitive;
  } else if (type === "journal_entry") {
    const entry = await db.journalEntry.findFirst({
      where: { id, userId: user.id!, deletedAt: null },
    });
    if (!entry) return notFound("Journal entry");
    text = entry.contentPlain;
    isSensitive = entry.isSensitive;
  } else {
    return badRequest("Invalid type. Must be 'note' or 'journal_entry'");
  }

  if (isSensitive) {
    const sidecarUrl = process.env.AI_SIDECAR_URL ?? "http://localhost:8000";
    const healthCheck = await fetch(`${sidecarUrl}/health`).catch(() => null);
    if (!healthCheck?.ok) {
      return badRequest("Sensitive content requires local AI processing, but the local model is unavailable");
    }
  }

  const result = await callSidecar<{ summary: string }>("/summarize", {
    text,
    is_sensitive: isSensitive,
  });

  return success({ summary: result.summary, entityType: type, entityId: id });
}
