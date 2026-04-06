import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { streamSidecar } from "@/lib/ai-client";
import { badRequest, unauthorized } from "@/lib/api-response";
import { getUserAIConfig } from "@/lib/get-user-ai-settings";

const chatSchema = z.object({
  query: z.string().min(1),
  routingChoice: z.enum(["local", "cloud"]).default("local"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(10)
    .optional(),
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

  const aiConfig = await getUserAIConfig(user.id!);

  const sidecarRes = await streamSidecar("/chat/stream", {
    query: parsed.data.query,
    user_id: user.id!,
    routing_choice: parsed.data.routingChoice,
    messages: parsed.data.messages ?? null,
    config: {
      routing_mode: aiConfig.routingMode,
      api_key: aiConfig.anthropicApiKey,
      ollama_url: aiConfig.ollamaBaseUrl,
      chat_model_cloud: aiConfig.chatModelCloud,
      chat_model_local: aiConfig.chatModelLocal,
      cloud_provider: aiConfig.cloudProvider,
      openai_base_url: aiConfig.openaiBaseUrl,
      openai_api_key: aiConfig.openaiApiKey,
      openai_model: aiConfig.openaiModel,
    },
  });

  return new Response(sidecarRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
