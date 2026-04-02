import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { getUserAIConfig } from "@/lib/get-user-ai-settings";

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

  const aiConfig = await getUserAIConfig(user.id!);

  const result = await callSidecar<{ result: string }>("/transform", {
    text: parsed.data.text,
    action: parsed.data.action,
    is_sensitive: parsed.data.isSensitive,
    config: {
      routing_mode: aiConfig.routingMode,
      api_key: aiConfig.anthropicApiKey,
      ollama_url: aiConfig.ollamaBaseUrl,
      chat_model_cloud: aiConfig.chatModelCloud,
      chat_model_local: aiConfig.chatModelLocal,
    },
  });

  return success(result);
}
