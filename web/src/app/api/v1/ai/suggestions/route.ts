import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const jobs = await db.aIJobLog.findMany({
    where: {
      userId: user.id!,
      jobType: "auto_tag",
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    take: 20,
  });

  return success(jobs);
}
