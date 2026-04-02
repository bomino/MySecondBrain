"use client";

import Link from "next/link";
import { Lock, Flame, BookOpen } from "lucide-react";
import { useJournalEntries, useJournalStreaks } from "@/hooks/use-journal";
import { NoteListSkeleton } from "@/components/ui/skeleton";
import { CalendarHeatmap } from "@/components/journal/calendar-heatmap";

export default function JournalPage() {
  const today = new Date().toISOString().split("T")[0];
  const { data, isLoading } = useJournalEntries();
  const { data: streaks } = useJournalStreaks();

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Journal</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-faint)" }}>
            {data?.total ?? 0} entries
          </p>
          {streaks && streaks.currentStreak > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[12px]" style={{ color: "var(--accent)" }}>
              <Flame size={13} />
              <span>{streaks.currentStreak} day streak</span>
            </div>
          )}
        </div>
        <Link href={`/journal/${today}`} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] btn-accent">
          Today
        </Link>
      </div>
      {data?.data && (
        <div className="mb-6">
          <CalendarHeatmap dates={data.data.map((e) => e.date)} />
        </div>
      )}
      {isLoading ? (
        <NoteListSkeleton count={3} />
      ) : data?.data && data.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 fade-in">
          <BookOpen size={40} style={{ color: "var(--text-faint)", opacity: 0.3 }} />
          <p className="mt-3" style={{ color: "var(--text-muted)" }}>No journal entries yet.</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-faint)" }}>Start your first entry today.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 stagger-in">
          {(data?.data ?? []).map((entry) => (
            <Link
              key={entry.id}
              href={`/journal/${entry.date.split("T")[0]}`}
              className="block rounded-[10px] p-4 card-hover"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {entry.date.split("T")[0]}
                  </span>
                  <Lock size={12} style={{ color: "var(--destructive)", opacity: 0.6 }} />
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: "var(--text-faint)" }}>
                  {entry.mood && <span>Mood: {entry.mood}/5</span>}
                  {entry.energy && <span>Energy: {entry.energy}/5</span>}
                </div>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                {entry.contentPlain}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
