import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { success, badRequest, error } from "@/lib/api-response";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const { email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return error("Email already registered", "CONFLICT", 409);
  }

  const passwordHash = await hash(password, 12);
  const user = await db.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  });

  return success(user, 201);
}
