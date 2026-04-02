"use client";

import { useState } from "react";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import { useTags, useCreateTag, useDeleteTag } from "@/hooks/use-tags";
import { ColorPicker } from "@/components/tags/color-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function SettingsPage() {
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#d97706");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createTag.mutate({ name: newName.trim(), color: newColor });
    setNewName("");
  }

  return (
    <div className="mx-auto max-w-2xl p-8 fade-in">
      <h1 className="mb-6 text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Settings</h1>

      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          <TagIcon size={16} className="mr-2 inline" />
          Tags
        </h2>

        <form onSubmit={handleCreate} className="mb-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New tag name"
              className="w-full rounded-lg px-3 py-2 text-sm input-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>Color</label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <button type="submit" className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm btn-accent">
            <Plus size={14} /> Add
          </button>
        </form>

        {isLoading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : (tags ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm" style={{ color: "var(--text-faint)" }}>No tags yet.</p>
        ) : (
          <div className="flex flex-col gap-2 stagger-in">
            {(tags ?? []).map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between rounded-lg p-3"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{tag.name}</span>
                </div>
                <button
                  onClick={() => setDeleteId(tag.id)}
                  className="rounded p-1 transition-colors duration-100"
                  style={{ color: "var(--text-faint)" }}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete tag"
        description="This will remove the tag from all notes. Continue?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteId) deleteTag.mutate(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
