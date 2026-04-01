import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const tags = await db.tag.findMany({
    where: { userId: user.id! },
    orderBy: { name: "asc" },
  });

  return success(tags);
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const tag = await db.tag.create({
    data: { userId: user.id!, ...parsed.data },
  });

  return success(tag, 201);
}
