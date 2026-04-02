"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl shadow-2xl fade-in"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Search size={16} style={{ color: "var(--text-faint)" }} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type + to create..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(data?.data ?? []).map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full px-4 py-2.5 text-left transition-colors duration-100"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                {r.type === "note" ? "Note" : "Journal"}
              </span>
              <p className="text-sm">{r.title || "Untitled"}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
