import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, error, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";

const createEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.any().default({}),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  isSensitive: z.boolean().default(true),
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
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 30)));
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    userId: user.id!,
    deletedAt: null,
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        date: true,
        contentPlain: true,
        mood: true,
        energy: true,
        isSensitive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.journalEntry.count({ where }),
  ]);

  const formatted = entries.map((e) => ({
    ...e,
    contentPlain: e.contentPlain.slice(0, 200),
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
  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const { date, content, mood, energy, isSensitive } = parsed.data;
  const contentPlain = extractPlainText(content);

  const existing = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: null },
  });

  if (existing) {
    return error("Journal entry already exists for this date", "CONFLICT", 409);
  }

  const entry = await db.journalEntry.create({
    data: {
      userId: user.id!,
      date: new Date(date),
      content,
      contentPlain,
      mood,
      energy,
      isSensitive,
    },
  });

  return success(entry, 201);
}
