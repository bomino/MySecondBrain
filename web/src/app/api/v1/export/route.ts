import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const [notes, journalEntries, tags, taggables, noteLinks, templates] = await Promise.all([
    db.note.findMany({
      where: { userId: user.id!, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        contentPlain: true,
        parentId: true,
        isSensitive: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.journalEntry.findMany({
      where: { userId: user.id!, deletedAt: null },
      select: {
        id: true,
        date: true,
        content: true,
        contentPlain: true,
        mood: true,
        energy: true,
        isSensitive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { date: "asc" },
    }),
    db.tag.findMany({
      where: { userId: user.id! },
      select: { id: true, name: true, color: true },
    }),
    db.taggable.findMany({
      where: { tag: { userId: user.id! } },
      select: { tagId: true, entityType: true, entityId: true },
    }),
    db.noteLink.findMany({
      where: { source: { userId: user.id! } },
      select: { sourceId: true, targetId: true },
    }),
    db.noteTemplate.findMany({
      where: { userId: user.id! },
      select: { id: true, name: true, content: true, createdAt: true },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    notes,
    journalEntries,
    tags,
    taggables,
    noteLinks,
    templates,
    stats: {
      notes: notes.length,
      journalEntries: journalEntries.length,
      tags: tags.length,
      templates: templates.length,
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="second-brain-export-${date}.json"`,
    },
  });
}
