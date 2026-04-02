import { NextRequest } from "next/server";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, error, unauthorized } from "@/lib/api-response";

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  avatarUrl: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const dbUser = await db.user.findUnique({
    where: { id: user.id! },
    select: { id: true, email: true, avatarUrl: true, createdAt: true },
  });

  return success(dbUser);
}

export async function PUT(req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid input", parsed.error.flatten());

  const dbUser = await db.user.findUnique({ where: { id: user.id! } });
  if (!dbUser) return unauthorized();

  const updates: Record<string, unknown> = {};

  if (parsed.data.email && parsed.data.email !== dbUser.email) {
    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return error("Email already in use", "CONFLICT", 409);
    updates.email = parsed.data.email;
  }

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) {
      return badRequest("Current password is required to set a new password");
    }
    const valid = await compare(parsed.data.currentPassword, dbUser.passwordHash);
    if (!valid) {
      return badRequest("Current password is incorrect");
    }
    updates.passwordHash = await hash(parsed.data.newPassword, 12);
  }

  if (parsed.data.avatarUrl !== undefined) {
    updates.avatarUrl = parsed.data.avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    return success({ message: "No changes" });
  }

  const updated = await db.user.update({
    where: { id: user.id! },
    data: updates,
    select: { id: true, email: true, avatarUrl: true },
  });

  return success(updated);
}
