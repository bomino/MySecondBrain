import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const settingsSchema = z
  .object({
    aiRoutingMode: z.enum(["hybrid", "local", "cloud"]).optional(),
    anthropicApiKey: z.string().optional(),
    ollamaBaseUrl: z.string().url().optional(),
    chatModelCloud: z.string().optional(),
    chatModelLocal: z.string().optional(),
    embeddingModel: z.string().optional(),
    cloudProvider: z.enum(["anthropic", "openai"]).optional(),
    openaiBaseUrl: z.string().optional(),
    openaiApiKey: z.string().optional(),
    openaiModel: z.string().optional(),
    autoTagEnabled: z.boolean().optional(),
    autoTagAutoApply: z.boolean().optional(),
    defaultNoteSensitive: z.boolean().optional(),
    defaultSearchMode: z.enum(["combined", "fulltext", "semantic"]).optional(),
    toastsEnabled: z.boolean().optional(),
  })
  .partial();

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id! },
    select: { settings: true },
  });

  const settings = (dbUser?.settings as Record<string, unknown>) ?? {};

  return success({
    aiRoutingMode: settings.aiRoutingMode ?? process.env.AI_ROUTING_MODE ?? "hybrid",
    anthropicApiKey: settings.anthropicApiKey
      ? "••••••••"
      : process.env.ANTHROPIC_API_KEY
        ? "••••••••(env)"
        : "",
    ollamaBaseUrl: settings.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    chatModelCloud: settings.chatModelCloud ?? "claude-sonnet-4-6-20250514",
    chatModelLocal: settings.chatModelLocal ?? "llama3",
    embeddingModel: settings.embeddingModel ?? "nomic-embed-text",
    cloudProvider: settings.cloudProvider ?? "anthropic",
    openaiBaseUrl: settings.openaiBaseUrl ?? "https://api.openai.com",
    openaiApiKey: settings.openaiApiKey ? "••••••••" : "",
    openaiModel: settings.openaiModel ?? "gpt-4o",
    hasOpenaiKeyOverride: !!settings.openaiApiKey,
    hasApiKeyOverride: !!settings.anthropicApiKey,
    hasEnvApiKey: !!process.env.ANTHROPIC_API_KEY,
    autoTagEnabled: settings.autoTagEnabled ?? true,
    autoTagAutoApply: settings.autoTagAutoApply ?? false,
    defaultNoteSensitive: settings.defaultNoteSensitive ?? false,
    defaultSearchMode: settings.defaultSearchMode ?? "combined",
    toastsEnabled: settings.toastsEnabled ?? true,
  });
}

export async function PUT(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid settings", parsed.error.flatten());

  const current = await db.user.findUnique({
    where: { id: user.id! },
    select: { settings: true },
  });

  const currentSettings = (current?.settings as Record<string, unknown>) ?? {};
  const newSettings = { ...currentSettings };

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) {
      continue;
    } else if (value === "") {
      delete newSettings[key];
    } else {
      newSettings[key] = value;
    }
  }

  await db.user.update({
    where: { id: user.id! },
    data: { settings: newSettings },
  });

  return success({ updated: true });
}
