import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const [notes, entries] = await Promise.all([
    db.note.findMany({
      where: { userId: user.id!, deletedAt: { not: null } },
      select: { id: true, title: true, deletedAt: true, updatedAt: true },
      orderBy: { deletedAt: "desc" },
      take: 50,
    }),
    db.journalEntry.findMany({
      where: { userId: user.id!, deletedAt: { not: null } },
      select: { id: true, date: true, deletedAt: true, updatedAt: true },
      orderBy: { deletedAt: "desc" },
      take: 50,
    }),
  ]);

  return success({
    notes: notes.map((n) => ({ ...n, type: "note" as const })),
    entries: entries.map((e) => ({ ...e, type: "journal_entry" as const, title: e.date.toISOString().split("T")[0] })),
  });
}
