import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ type: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { type, id } = await params;

  if (type === "note") {
    const note = await db.note.findFirst({ where: { id, userId: user.id!, deletedAt: null } });
    if (!note) return success({ semantic: [], mentions: [] });
  } else if (type === "journal_entry") {
    const entry = await db.journalEntry.findFirst({ where: { id, userId: user.id!, deletedAt: null } });
    if (!entry) return success({ semantic: [], mentions: [] });
  }

  const [sidecarResult, titleMatches] = await Promise.all([
    callSidecar<{ items: { entity_type: string; entity_id: string; similarity: number }[] }>("/related", {
      entity_type: type,
      entity_id: id,
      user_id: user.id!,
      top_k: 5,
    }).catch(() => ({ items: [] })),

    type === "note"
      ? (async () => {
          const note = await db.note.findFirst({
            where: { id, userId: user.id!, deletedAt: null },
            select: { contentPlain: true },
          });
          if (!note || !note.contentPlain) return [];

          const otherNotes = await db.note.findMany({
            where: { userId: user.id!, deletedAt: null, id: { not: id }, title: { not: "" } },
            select: { id: true, title: true },
          });

          return otherNotes.filter(
            (n) => n.title && note.contentPlain.toLowerCase().includes(n.title.toLowerCase())
          );
        })()
      : [],
  ]);

  const semanticIds = sidecarResult.items.map((i) => i.entity_id);
  const semanticNotes = semanticIds.length > 0
    ? await db.note.findMany({
        where: { id: { in: semanticIds }, userId: user.id!, deletedAt: null },
        select: { id: true, title: true, contentPlain: true },
      })
    : [];

  const semanticEntries = sidecarResult.items
    .filter((i) => i.entity_type === "journal_entry")
    .map((i) => i.entity_id);
  const journalEntries = semanticEntries.length > 0
    ? await db.journalEntry.findMany({
        where: { id: { in: semanticEntries }, userId: user.id!, deletedAt: null },
        select: { id: true, date: true, contentPlain: true },
      })
    : [];

  const semantic = [
    ...semanticNotes.map((n) => ({
      id: n.id,
      type: "note" as const,
      title: n.title || "Untitled",
      snippet: n.contentPlain.slice(0, 100),
      similarity: sidecarResult.items.find((i) => i.entity_id === n.id)?.similarity ?? 0,
    })),
    ...journalEntries.map((e) => ({
      id: e.id,
      type: "journal_entry" as const,
      title: e.date.toISOString().split("T")[0],
      snippet: e.contentPlain.slice(0, 100),
      similarity: sidecarResult.items.find((i) => i.entity_id === e.id)?.similarity ?? 0,
    })),
  ].sort((a, b) => b.similarity - a.similarity);

  const mentions = (titleMatches as { id: string; title: string }[]).map((n) => ({
    id: n.id,
    type: "note" as const,
    title: n.title,
  }));

  return success({ semantic, mentions });
}
