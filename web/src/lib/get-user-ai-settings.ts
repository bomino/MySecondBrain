import { db } from "./db";

export interface AIConfig {
  routingMode: string;
  anthropicApiKey: string;
  ollamaBaseUrl: string;
  chatModelCloud: string;
  chatModelLocal: string;
  embeddingModel: string;
  cloudProvider: string;
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;
}

export async function getUserSettings(userId: string): Promise<Record<string, unknown>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  return (user?.settings as Record<string, unknown>) ?? {};
}

export async function getUserAIConfig(userId: string): Promise<AIConfig> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  const s = (user?.settings as Record<string, string>) ?? {};

  return {
    routingMode: s.aiRoutingMode ?? process.env.AI_ROUTING_MODE ?? "hybrid",
    anthropicApiKey: s.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? "",
    ollamaBaseUrl: s.ollamaBaseUrl ?? "",
    chatModelCloud: s.chatModelCloud ?? "",
    chatModelLocal: s.chatModelLocal ?? "",
    embeddingModel: s.embeddingModel ?? "",
    cloudProvider: s.cloudProvider ?? "anthropic",
    openaiBaseUrl: s.openaiBaseUrl ?? "",
    openaiApiKey: s.openaiApiKey ?? "",
    openaiModel: s.openaiModel ?? "",
  };
}
