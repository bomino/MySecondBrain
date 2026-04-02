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

  if (isLoading) return <p className="p-8" style={{ color: "var(--text-muted)" }}>Loading...</p>;
  if (!note) return <p className="p-8" style={{ color: "var(--destructive)" }}>Note not found</p>;

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="mb-6 w-full border-none bg-transparent text-[28px] font-semibold focus:outline-none"
        style={{ color: "var(--text-primary)" }}
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
