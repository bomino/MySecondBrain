import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, notFound, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";

const updateEntrySchema = z.object({
  content: z.any().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  isSensitive: z.boolean().optional(),
});

type Params = { params: Promise<{ date: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { date } = await params;

  const entry = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: null },
  });

  if (!entry) return notFound("Journal entry");

  const taggables = await db.taggable.findMany({
    where: { entityType: "journal_entry", entityId: entry.id },
    include: { tag: { select: { id: true, name: true, color: true } } },
  });

  return success({
    ...entry,
    tags: taggables.map((t) => t.tag),
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { date } = await params;
  const body = await req.json();
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const existing = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: null },
  });
  if (!existing) return notFound("Journal entry");

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.content !== undefined) {
    data.contentPlain = extractPlainText(parsed.data.content);
  }

  const entry = await db.journalEntry.update({
    where: { id: existing.id },
    data,
  });

  return success(entry);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { date } = await params;

  const existing = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: null },
  });
  if (!existing) return notFound("Journal entry");

  await db.journalEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  return success({ deleted: true });
}
