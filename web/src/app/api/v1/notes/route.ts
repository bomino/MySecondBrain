import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";
import { enqueueAIJob } from "@/lib/queue";

const createNoteSchema = z.object({
  title: z.string().default(""),
  content: z.any().default({}),
  parentId: z.string().uuid().nullable().optional(),
  isSensitive: z.boolean().default(false),
  tagIds: z.array(z.string().uuid()).default([]),
});

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const parentId = searchParams.get("parentId") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;

  let noteIdsWithTag: string[] | undefined;
  if (tag) {
    const taggedEntries = await db.taggable.findMany({
      where: { entityType: "note", tag: { name: tag, userId: user.id! } },
      select: { entityId: true },
    });
    noteIdsWithTag = taggedEntries.map((t) => t.entityId);
  }

  const where = {
    userId: user.id!,
    deletedAt: null,
    ...(parentId !== undefined ? { parentId: parentId || null } : {}),
    ...(noteIdsWithTag !== undefined ? { id: { in: noteIdsWithTag } } : {}),
  };

  const sort = searchParams.get("sort") ?? "recent";
  let orderBy: Record<string, string>[] = [{ isPinned: "desc" }];
  if (sort === "title") {
    orderBy.push({ title: "asc" });
  } else if (sort === "created") {
    orderBy.push({ createdAt: "desc" });
  } else {
    orderBy.push({ updatedAt: "desc" });
  }

  const [notes, total] = await Promise.all([
    db.note.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        contentPlain: true,
        parentId: true,
        isSensitive: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.note.count({ where }),
  ]);

  const noteIds = notes.map((n) => n.id);
  const taggables = noteIds.length > 0
    ? await db.taggable.findMany({
        where: { entityType: "note", entityId: { in: noteIds } },
        include: { tag: { select: { id: true, name: true, color: true } } },
      })
    : [];

  const tagsByNote = new Map<string, { id: string; name: string; color: string }[]>();
  for (const t of taggables) {
    const list = tagsByNote.get(t.entityId) ?? [];
    list.push(t.tag);
    tagsByNote.set(t.entityId, list);
  }

  const formatted = notes.map((n) => ({
    ...n,
    contentPlain: n.contentPlain.slice(0, 200),
    tags: tagsByNote.get(n.id) ?? [],
  }));

  return success({ data: formatted, total, page, limit });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const { title, content, parentId, isSensitive } = parsed.data;
  const contentPlain = extractPlainText(content);

  const note = await db.note.create({
    data: {
      userId: user.id!,
      title,
      content,
      contentPlain,
      parentId: parentId ?? null,
      isSensitive,
    },
  });

  if (parsed.data.tagIds.length > 0) {
    await db.taggable.createMany({
      data: parsed.data.tagIds.map((tagId) => ({
        tagId,
        entityType: "note",
        entityId: note.id,
      })),
    });
  }

  if (contentPlain.length > 0) {
    await enqueueAIJob(user.id!, "note", note.id, "embed", {
      text: `${title}\n${contentPlain}`,
      is_sensitive: isSensitive,
    });
  }

  if (contentPlain.length > 0) {
    await enqueueAIJob(user.id!, "note", note.id, "auto_tag", {
      text: `${title}\n${contentPlain}`,
      is_sensitive: isSensitive,
    });
  }

  return success(note, 201);
}
