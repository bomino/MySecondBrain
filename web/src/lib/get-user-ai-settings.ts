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
    ollamaBaseUrl: s.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    chatModelCloud: s.chatModelCloud ?? "claude-sonnet-4-6-20250514",
    chatModelLocal: s.chatModelLocal ?? "llama3",
    embeddingModel: s.embeddingModel ?? "nomic-embed-text",
    cloudProvider: s.cloudProvider ?? "anthropic",
    openaiBaseUrl: s.openaiBaseUrl ?? "https://api.openai.com",
    openaiApiKey: s.openaiApiKey ?? "",
    openaiModel: s.openaiModel ?? "gpt-4o",
  };
}
