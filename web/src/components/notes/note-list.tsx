"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

interface NoteListProps {
  notes: {
    id: string;
    title: string;
    contentPlain: string;
    isSensitive?: boolean;
    tags: { id: string; name: string; color: string }[];
    updatedAt: string;
  }[];
}

const TAG_COLORS: Record<string, string> = {
  "#d97706": "tag-amber",
  "#2563eb": "tag-blue",
  "#16a34a": "tag-green",
  "#ef4444": "tag-red",
  "#8b5cf6": "tag-purple",
  "#6366f1": "tag-purple",
};

function getTagClass(color: string): string {
  return TAG_COLORS[color] || "tag-amber";
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 fade-in">
        <p style={{ color: "var(--text-muted)" }}>No notes yet.</p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-faint)" }}>
          Create your first note to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 fade-in">
      {notes.map((note) => (
        <Link
          key={note.id}
          href={`/notes/${note.id}`}
          className="block rounded-[10px] p-4 card-hover"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {note.isSensitive && <Lock size={12} style={{ color: "var(--destructive)" }} />}
              {note.title || "Untitled"}
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              {timeAgo(note.updatedAt)}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
            {note.contentPlain}
          </p>
          {note.tags.length > 0 && (
            <div className="mt-2.5 flex gap-1.5">
              {note.tags.map((tag) => (
                <span key={tag.id} className={`tag ${getTagClass(tag.color)}`}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
