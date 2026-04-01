import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { fullTextSearch, semanticSearch, combinedSearch } from "@/lib/search";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return badRequest("Query parameter 'q' is required");
  }

  const mode = searchParams.get("mode") ?? "combined";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  let results;
  switch (mode) {
    case "semantic":
      results = await semanticSearch(user.id!, q, limit);
      break;
    case "fulltext":
      results = await fullTextSearch(user.id!, q, limit);
      break;
    default:
      results = await combinedSearch(user.id!, q, limit);
  }

  return success({ data: results, query: q, mode });
}
