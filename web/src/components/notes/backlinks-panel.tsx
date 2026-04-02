"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface BacklinksPanelProps {
  noteId: string;
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { data } = useQuery({
    queryKey: ["backlinks", noteId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/notes/${noteId}/backlinks`);
      if (!res.ok) return [];
      return res.json() as Promise<{ id: string; title: string; contentPlain: string }[]>;
    },
    enabled: !!noteId,
  });

  const count = data?.length ?? 0;
  if (count === 0) return null;

  return (
    <div className="mt-8 rounded-[10px]" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Link2 size={14} />
        <span>Backlinks</span>
        <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "var(--elevated)", color: "var(--text-faint)" }}>
          {count}
        </span>
      </button>
      {expanded && (
        <div className="border-t px-4 pb-3 pt-2" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-col gap-2 stagger-in">
            {(data ?? []).map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="block rounded-lg p-2 transition-colors duration-100"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span className="text-sm font-medium">{note.title || "Untitled"}</span>
                <p className="mt-0.5 text-xs line-clamp-1" style={{ color: "var(--text-muted)" }}>
                  {note.contentPlain}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
