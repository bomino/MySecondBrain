import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";

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

  const where = {
    userId: user.id!,
    deletedAt: null,
    ...(parentId !== undefined ? { parentId: parentId || null } : {}),
    ...(tag
      ? { taggables: { some: { tag: { name: tag } } } }
      : {}),
  };

  const [notes, total] = await Promise.all([
    db.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        contentPlain: true,
        parentId: true,
        isSensitive: true,
        createdAt: true,
        updatedAt: true,
        taggables: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    db.note.count({ where }),
  ]);

  const formatted = notes.map((n) => ({
    ...n,
    contentPlain: n.contentPlain.slice(0, 200),
    tags: n.taggables.map((t) => t.tag),
    taggables: undefined,
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

  return success(note, 201);
}
