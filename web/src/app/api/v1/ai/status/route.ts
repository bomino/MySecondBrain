import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const [sidecarHealth, pendingJobs] = await Promise.all([
    fetch(`${process.env.AI_SIDECAR_URL ?? "http://localhost:8000"}/health`)
      .then((r) => r.ok)
      .catch(() => false),
    db.aIJobLog.count({
      where: { userId: user.id!, status: { in: ["queued", "processing"] } },
    }),
  ]);

  return success({
    sidecar: sidecarHealth,
    pendingJobs,
  });
}
