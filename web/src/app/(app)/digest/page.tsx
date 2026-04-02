"use client";

import Link from "next/link";
import { Lightbulb, Clock, Calendar, Unlink, Network, RefreshCw } from "lucide-react";
import { useDigest } from "@/hooks/use-digest";
import { formatTime, formatDate, toLocalDateStr } from "@/lib/date-utils";
import { NoteListSkeleton } from "@/components/ui/skeleton";

export default function DigestPage() {
  const { data: digest, isLoading, refetch } = useDigest();

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Daily Digest</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-faint)" }}>
            {digest ? `Generated ${formatTime(digest.generated_at)}` : "AI-powered insights from your knowledge base"}
          </p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-surface">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <NoteListSkeleton count={3} />
      ) : !digest ? (
        <p style={{ color: "var(--text-muted)" }}>Failed to generate digest. Is the AI sidecar running?</p>
      ) : (
        <div className="flex flex-col gap-6">
          {digest.on_this_day.length > 0 && (
            <Section icon={<Calendar size={16} />} title="On This Day" subtitle="Journal entries from this date in prior years">
              {digest.on_this_day.map((entry) => (
                <Link key={entry.id} href={`/journal/${toLocalDateStr(entry.date)}`} className="block rounded-lg p-3 card-hover" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{toLocalDateStr(entry.date)}</span>
                  <p className="mt-1 text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{entry.snippet}</p>
                </Link>
              ))}
            </Section>
          )}

          {digest.forgotten_relevance.length > 0 && (
            <Section icon={<Clock size={16} />} title="Forgotten But Relevant" subtitle="Old notes related to what you've been working on recently">
              {digest.forgotten_relevance.map((note) => (
                <Link key={note.id} href={`/notes/${note.id}`} className="block rounded-lg p-3 card-hover" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{note.title}</span>
                  <span className="ml-2 text-[10px]" style={{ color: "var(--text-faint)" }}>{Math.round(note.similarity * 100)}% similar</span>
                </Link>
              ))}
            </Section>
          )}

          {digest.orphans.length > 0 && (
            <Section icon={<Unlink size={16} />} title="Orphaned Notes" subtitle="No tags or links — consider connecting these">
              {digest.orphans.map((note) => (
                <Link key={note.id} href={`/notes/${note.id}`} className="block rounded-lg p-3 card-hover" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{note.title}</span>
                  <span className="ml-2 text-[10px]" style={{ color: "var(--text-faint)" }}>Created {formatDate(note.created_at)}</span>
                </Link>
              ))}
            </Section>
          )}

          {digest.clusters.length > 0 && (
            <Section icon={<Network size={16} />} title="Unlinked Clusters" subtitle="These notes are about similar topics but aren't linked">
              {digest.clusters.map((cluster, i) => (
                <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex flex-wrap gap-2">
                    {cluster.map((note) => (
                      <Link key={note.id} href={`/notes/${note.id}`} className="rounded-md px-2.5 py-1 text-xs transition-colors duration-150" style={{ backgroundColor: "var(--accent-muted)", color: "var(--accent-light)" }}>
                        {note.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {digest.on_this_day.length === 0 && digest.forgotten_relevance.length === 0 && digest.orphans.length === 0 && digest.clusters.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Lightbulb size={40} style={{ color: "var(--text-faint)", opacity: 0.3 }} />
              <p className="mt-3" style={{ color: "var(--text-muted)" }}>Nothing to surface today.</p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-faint)" }}>Keep writing — the digest gets smarter as your knowledge base grows.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: "var(--accent)" }}>{icon}</span>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
          <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 stagger-in">{children}</div>
    </div>
  );
}
