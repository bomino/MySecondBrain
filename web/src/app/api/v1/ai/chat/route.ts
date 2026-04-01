import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const chatSchema = z.object({
  query: z.string().min(1),
  routingChoice: z.enum(["local", "cloud"]).default("local"),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const result = await callSidecar<{
    answer: string;
    sources: { type: string; id: string; title: string; similarity: number }[];
    routed_to: string;
    has_sensitive_context: boolean;
  }>("/chat", {
    query: parsed.data.query,
    user_id: user.id!,
    routing_choice: parsed.data.routingChoice,
  });

  return success(result);
}
