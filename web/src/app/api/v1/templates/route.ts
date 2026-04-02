import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.any().default({}),
});

export async function GET(_req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const templates = await db.noteTemplate.findMany({
    where: { userId: user.id! },
    orderBy: { name: "asc" },
    select: { id: true, name: true, createdAt: true },
  });

  return success(templates);
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const body = await req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid input", parsed.error.flatten());

  const template = await db.noteTemplate.create({
    data: { userId: user.id!, name: parsed.data.name, content: parsed.data.content },
  });

  return success(template, 201);
}
