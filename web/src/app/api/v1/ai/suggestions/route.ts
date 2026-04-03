import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const noteId = req.nextUrl.searchParams.get("noteId");

  const where = {
    userId: user.id!,
    jobType: "auto_tag",
    status: "pending_review",
    ...(noteId ? { entityType: "note", entityId: noteId } : {}),
  };

  const jobs = await db.aIJobLog.findMany({
    where,
    orderBy: { completedAt: "desc" },
    take: 20,
    select: {
      id: true,
      entityType: true,
      entityId: true,
      result: true,
      completedAt: true,
    },
  });

  return success(jobs);
}
