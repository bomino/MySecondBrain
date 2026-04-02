import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, notFound, unauthorized } from "@/lib/api-response";
import { extractPlainText, extractWikiLinks } from "@/lib/tiptap-utils";
import { enqueueAIJob } from "@/lib/queue";

const updateNoteSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isSensitive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const note = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
    include: {
      children: {
        where: { deletedAt: null },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      },
    },
  });

  if (!note) return notFound("Note");

  const taggables = await db.taggable.findMany({
    where: { entityType: "note", entityId: id },
    include: { tag: { select: { id: true, name: true, color: true } } },
  });

  return success({
    ...note,
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

  const { id } = await params;
  const body = await req.json();
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const existing = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
  });
  if (!existing) return notFound("Note");

  const { tagIds, ...updateFields } = parsed.data;
  const data: Record<string, unknown> = { ...updateFields };
  if (parsed.data.content !== undefined) {
    data.contentPlain = extractPlainText(parsed.data.content);
  }

  const note = await db.note.update({ where: { id }, data });

  if (parsed.data.content !== undefined) {
    const linkTitles = extractWikiLinks(parsed.data.content);

    const targetNotes = await db.note.findMany({
      where: {
        userId: user.id!,
        title: { in: linkTitles },
        deletedAt: null,
      },
      select: { id: true },
    });

    await db.noteLink.deleteMany({ where: { sourceId: id } });

    if (targetNotes.length > 0) {
      await db.noteLink.createMany({
        data: targetNotes.map((t) => ({
          sourceId: id,
          targetId: t.id,
          context: "",
        })),
        skipDuplicates: true,
      });
    }

    const updatedPlain = data.contentPlain as string ?? existing.contentPlain;
    if (updatedPlain.length > 0) {
      await enqueueAIJob(user.id!, "note", id, "embed", {
        text: `${parsed.data.title ?? existing.title}\n${updatedPlain}`,
        is_sensitive: parsed.data.isSensitive ?? existing.isSensitive,
      });
    }
  }

  if (tagIds !== undefined) {
    await db.taggable.deleteMany({
      where: { entityType: "note", entityId: id },
    });
    if (tagIds.length > 0) {
      await db.taggable.createMany({
        data: tagIds.map((tagId) => ({
          tagId,
          entityType: "note",
          entityId: id,
        })),
      });
    }
  }

  return success(note);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const existing = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
  });
  if (!existing) return notFound("Note");

  await db.note.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return success({ deleted: true });
}
