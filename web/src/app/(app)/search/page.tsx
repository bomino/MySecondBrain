"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { SearchResults } from "@/components/search/search-results";
import { NoteListSkeleton } from "@/components/ui/skeleton";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("combined");
  const { data, isLoading } = useSearch(query, mode);

  const modes = ["combined", "fulltext", "semantic"] as const;

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <h1 className="mb-6 text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Search</h1>

      <div className="mb-4 flex items-center gap-2 rounded-[10px] px-3 py-2.5 input-base">
        <SearchIcon size={16} style={{ color: "var(--text-faint)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your knowledge base..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      <div className="mb-6 flex gap-1">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: mode === m ? "var(--accent-muted)" : "transparent",
              color: mode === m ? "var(--accent-light)" : "var(--text-muted)",
            }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {isLoading && query.length >= 2 && <NoteListSkeleton count={3} />}
      {data && <SearchResults results={data.data} />}
      {data && data.data.length === 0 && query.length >= 2 && (
        <div className="flex flex-col items-center justify-center py-16 fade-in">
          <SearchIcon size={40} style={{ color: "var(--text-faint)", opacity: 0.3 }} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
            No results for "{query}"
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
            Try a different search term or mode
          </p>
        </div>
      )}
    </div>
  );
}
