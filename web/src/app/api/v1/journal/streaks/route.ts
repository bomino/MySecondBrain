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

  const entries = await db.journalEntry.findMany({
    where: { userId: user.id!, deletedAt: null },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const dates = entries.map((e) => e.date.toISOString().split("T")[0]);

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  const dateSet = new Set(dates);

  const d = new Date();
  let checking = true;
  while (checking) {
    const dateStr = d.toISOString().split("T")[0];
    if (dateSet.has(dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      checking = false;
    }
  }
  currentStreak = streak;

  streak = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        streak++;
      } else {
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  return success({
    currentStreak,
    longestStreak,
    totalEntries: dates.length,
  });
}
