"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Compass, Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface RelatedNotesPanelProps {
  noteId: string;
}

export function RelatedNotesPanel({ noteId }: RelatedNotesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["related", noteId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/ai/related/note/${noteId}`);
      if (!res.ok) return { semantic: [], mentions: [] };
      return res.json() as Promise<{
        semantic: { id: string; type: string; title: string; snippet: string; similarity: number }[];
        mentions: { id: string; type: string; title: string }[];
      }>;
    },
    enabled: !!noteId,
    staleTime: 60000,
  });

  const totalCount = (data?.semantic?.length ?? 0) + (data?.mentions?.length ?? 0);
  if (!isLoading && totalCount === 0) return null;

  return (
    <div className="mt-4 rounded-[10px]" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Compass size={14} />
        <span>Related Notes</span>
        {totalCount > 0 && (
          <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "var(--elevated)", color: "var(--text-faint)" }}>
            {totalCount}
          </span>
        )}
        {isLoading && (
          <span className="ml-1 text-[10px]" style={{ color: "var(--text-faint)" }}>Processing...</span>
        )}
      </button>
      {expanded && (
        <div className="border-t px-4 pb-3 pt-2" style={{ borderColor: "var(--border)" }}>
          {data?.mentions && data.mentions.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase" style={{ color: "var(--text-faint)" }}>
                <Link2 size={10} /> Mentioned in this note
              </p>
              <div className="flex flex-col gap-1">
                {data.mentions.map((item) => (
                  <Link
                    key={item.id}
                    href={`/notes/${item.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm transition-colors duration-100"
                    style={{ color: "var(--accent-light)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {data?.semantic && data.semantic.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase" style={{ color: "var(--text-faint)" }}>
                <Compass size={10} /> Semantically similar
              </p>
              <div className="flex flex-col gap-1 stagger-in">
                {data.semantic.map((item) => {
                  const href = item.type === "note" ? `/notes/${item.id}` : `/journal/${item.title}`;
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className="block rounded-md px-2 py-1.5 transition-colors duration-100"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</span>
                      <p className="mt-0.5 text-xs line-clamp-1" style={{ color: "var(--text-muted)" }}>{item.snippet}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
