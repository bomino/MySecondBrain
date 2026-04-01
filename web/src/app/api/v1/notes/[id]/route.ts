import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, notFound, unauthorized } from "@/lib/api-response";
import { extractPlainText, extractWikiLinks } from "@/lib/tiptap-utils";

const updateNoteSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isSensitive: z.boolean().optional(),
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
      taggables: {
        select: { tag: { select: { id: true, name: true, color: true } } },
      },
      children: {
        where: { deletedAt: null },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      },
    },
  });

  if (!note) return notFound("Note");

  return success({
    ...note,
    tags: note.taggables.map((t) => t.tag),
    taggables: undefined,
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

  const data: Record<string, unknown> = { ...parsed.data };
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
