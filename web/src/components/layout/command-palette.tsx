"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/use-search";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { data } = useSearch(query);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!open) return null;

  function handleSelect(result: { type: string; id: string; title: string }) {
    setOpen(false);
    setQuery("");
    if (result.type === "note") {
      router.push(`/notes/${result.id}`);
    } else {
      router.push(`/journal/${result.title}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or type + to create..."
          className="w-full rounded-t-lg border-b px-4 py-3 focus:outline-none dark:bg-gray-800 dark:text-white"
        />
        <div className="max-h-80 overflow-y-auto">
          {(data?.data ?? []).map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span className="text-xs text-gray-400">{r.type === "note" ? "Note" : "Journal"}</span>
              <p className="text-sm">{r.title || "Untitled"}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
