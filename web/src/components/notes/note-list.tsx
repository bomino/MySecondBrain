"use client";

import Link from "next/link";

interface NoteListProps {
  notes: {
    id: string;
    title: string;
    contentPlain: string;
    tags: { id: string; name: string; color: string }[];
    updatedAt: string;
  }[];
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return <p className="py-8 text-center text-gray-500">No notes yet. Create your first note.</p>;
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <Link
          key={note.id}
          href={`/notes/${note.id}`}
          className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <h3 className="font-medium">{note.title || "Untitled"}</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{note.contentPlain}</p>
          <div className="mt-2 flex gap-1">
            {note.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded px-2 py-0.5 text-xs"
                style={{ backgroundColor: tag.color + "20", color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
