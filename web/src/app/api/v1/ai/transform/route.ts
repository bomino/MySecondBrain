import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const transformSchema = z.object({
  text: z.string().min(1),
  action: z.enum(["improve", "simplify", "expand", "summarize"]),
  isSensitive: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = transformSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid input", parsed.error.flatten());

  const result = await callSidecar<{ result: string }>("/transform", {
    text: parsed.data.text,
    action: parsed.data.action,
    is_sensitive: parsed.data.isSensitive,
  });

  return success(result);
}
