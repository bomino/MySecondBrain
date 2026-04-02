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
    return <p className="py-4 text-center text-gray-500">No results found.</p>;
  }

  return (
    <div className="space-y-2">
      {results.map((r) => {
        const href = r.type === "note" ? `/notes/${r.id}` : `/journal/${r.title}`;
        return (
          <Link
            key={`${r.type}-${r.id}`}
            href={href}
            className="block rounded border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {r.type === "note" ? "Note" : "Journal"}
              </span>
              <span className="font-medium">{r.title || "Untitled"}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{r.snippet}</p>
          </Link>
        );
      })}
    </div>
  );
}
