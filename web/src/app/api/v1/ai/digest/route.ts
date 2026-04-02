import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const digest = await callSidecar<{
    forgotten_relevance: { id: string; title: string; similarity: number }[];
    on_this_day: { id: string; date: string; snippet: string }[];
    orphans: { id: string; title: string; created_at: string }[];
    clusters: { id: string; title: string }[][];
    generated_at: string;
  }>("/digest", { user_id: user.id! });

  return success(digest);
}
