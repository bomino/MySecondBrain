"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useNote, useUpdateNote } from "@/hooks/use-notes";
import { TiptapEditor } from "@/components/editor/tiptap-editor";

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading } = useNote(id);
  const updateNote = useUpdateNote();
  const [title, setTitle] = useState("");
  const [titleLoaded, setTitleLoaded] = useState(false);

  if (!titleLoaded && note) {
    setTitle(note.title);
    setTitleLoaded(true);
  }

  const handleTitleBlur = useCallback(() => {
    if (note && title !== note.title) {
      updateNote.mutate({ id, title });
    }
  }, [id, title, note, updateNote]);

  const handleContentUpdate = useCallback(
    (content: Record<string, unknown>) => {
      updateNote.mutate({ id, content });
    },
    [id, updateNote]
  );

  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (!note) return <p className="p-6 text-red-500">Note not found</p>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="mb-4 w-full border-none bg-transparent text-3xl font-bold focus:outline-none"
        placeholder="Untitled"
      />
      <TiptapEditor
        content={note.content as Record<string, unknown>}
        onUpdate={handleContentUpdate}
        placeholder="Start writing..."
      />
    </div>
  );
}
