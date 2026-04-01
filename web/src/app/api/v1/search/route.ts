import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { fullTextSearch } from "@/lib/search";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return badRequest("Query parameter 'q' is required");
  }

  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20)));

  const results = await fullTextSearch(user.id!, q, limit);

  return success({ data: results, query: q });
}
