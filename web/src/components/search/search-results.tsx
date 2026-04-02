"use client";

import Link from "next/link";

interface SearchResult {
  id: string;
  type: "note" | "journal_entry";
  title: string;
  snippet: string;
  rank: number;
}

export function SearchResults({ results }: { results: SearchResult[] }) {
  if (results.length === 0) {
    return <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No results found.</p>;
  }

  return (
    <div className="flex flex-col gap-2 fade-in">
      {results.map((r) => {
        const href = r.type === "note" ? `/notes/${r.id}` : `/journal/${r.title}`;
        return (
          <Link
            key={`${r.type}-${r.id}`}
            href={href}
            className="block rounded-[10px] p-3 card-hover"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: "var(--elevated)", color: "var(--text-faint)" }}
              >
                {r.type === "note" ? "Note" : "Journal"}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {r.title || "Untitled"}
              </span>
            </div>
            <p className="mt-1 text-[13px] line-clamp-2" style={{ color: "var(--text-muted)" }}>{r.snippet}</p>
          </Link>
        );
      })}
    </div>
  );
}
