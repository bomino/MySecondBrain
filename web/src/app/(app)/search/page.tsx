"use client";

import { useState } from "react";
import { useSearch } from "@/hooks/use-search";
import { SearchResults } from "@/components/search/search-results";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("combined");
  const { data, isLoading } = useSearch(query, mode);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Search</h1>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your knowledge base..."
          className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="combined">Combined</option>
          <option value="fulltext">Full-text</option>
          <option value="semantic">Semantic</option>
        </select>
      </div>
      {isLoading && <p className="text-gray-500">Searching...</p>}
      {data && <SearchResults results={data.data} />}
    </div>
  );
}
