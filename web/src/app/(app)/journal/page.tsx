"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useJournalEntries } from "@/hooks/use-journal";

export default function JournalPage() {
  const today = new Date().toISOString().split("T")[0];
  const { data, isLoading } = useJournalEntries();

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Journal</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-faint)" }}>
            {data?.total ?? 0} entries
          </p>
        </div>
        <Link href={`/journal/${today}`} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] btn-accent">
          Today
        </Link>
      </div>
      {isLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div className="flex flex-col gap-2">
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
