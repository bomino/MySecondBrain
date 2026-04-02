"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronRight, Trash2, Lock, Unlock, Tag as TagIcon, X } from "lucide-react";
import { useNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes";
import { useTags } from "@/hooks/use-tags";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: note, isLoading } = useNote(id);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { data: allTags } = useTags();
  const [title, setTitle] = useState("");
  const [titleLoaded, setTitleLoaded] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

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

  const handleToggleSensitive = useCallback(() => {
    if (note) {
      updateNote.mutate({ id, isSensitive: !note.isSensitive });
    }
  }, [id, note, updateNote]);

  const handleToggleTag = useCallback(
    (tagId: string) => {
      if (!note) return;
      const currentTagIds = note.tags.map((t) => t.id);
      const newTagIds = currentTagIds.includes(tagId)
        ? currentTagIds.filter((tid) => tid !== tagId)
        : [...currentTagIds, tagId];
      updateNote.mutate({ id, tagIds: newTagIds });
    },
    [id, note, updateNote]
  );

  const handleDelete = useCallback(() => {
    deleteNote.mutate(id, { onSuccess: () => router.push("/notes") });
    setShowDelete(false);
  }, [id, deleteNote, router]);

  if (isLoading) return <p className="p-8" style={{ color: "var(--text-muted)" }}>Loading...</p>;
  if (!note) return <p className="p-8" style={{ color: "var(--destructive)" }}>Note not found</p>;

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-4 flex items-center gap-1 text-sm" style={{ color: "var(--text-faint)" }}>
        <Link href="/notes" className="transition-colors duration-150 hover:underline" style={{ color: "var(--text-muted)" }}>
          Notes
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: "var(--text-secondary)" }}>{note.title || "Untitled"}</span>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={handleToggleSensitive}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs btn-surface"
          title={note.isSensitive ? "Mark as non-sensitive" : "Mark as sensitive"}
          aria-label={note.isSensitive ? "Mark as non-sensitive" : "Mark as sensitive"}
        >
          {note.isSensitive ? <Lock size={13} style={{ color: "var(--destructive)" }} /> : <Unlock size={13} />}
          {note.isSensitive ? "Sensitive" : "Public"}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowTagPicker(!showTagPicker)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs btn-surface"
            aria-label="Manage tags"
          >
            <TagIcon size={13} /> Tags
          </button>
          {showTagPicker && allTags && (
            <div
              className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg p-2 shadow-lg"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {allTags.length === 0 && (
                <p className="px-2 py-1 text-xs" style={{ color: "var(--text-faint)" }}>No tags yet</p>
              )}
              {allTags.map((tag) => {
                const active = note.tags.some((t) => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors duration-100"
                    style={{
                      color: active ? "var(--accent-light)" : "var(--text-secondary)",
                      backgroundColor: active ? "var(--accent-muted)" : "transparent",
                    }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                    {active && <X size={12} className="ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowDelete(true)}
          className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs btn-surface"
          style={{ color: "var(--destructive)" }}
          aria-label="Delete note"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>

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

      <ConfirmDialog
        open={showDelete}
        title="Delete note"
        description="This note will be moved to trash. This action can be undone by an admin."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
