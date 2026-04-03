"use client";

import { useState } from "react";
import { Trash2, RotateCcw, X } from "lucide-react";
import { useTrash, useRestoreNote, useRestoreJournalEntry, useEmptyTrash, usePermanentDeleteNote, usePermanentDeleteJournalEntry } from "@/hooks/use-trash";
import { formatDate } from "@/lib/date-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function TrashPage() {
  const { data, isLoading } = useTrash();
  const restoreNote = useRestoreNote();
  const restoreEntry = useRestoreJournalEntry();
  const emptyTrash = useEmptyTrash();
  const permanentDeleteNote = usePermanentDeleteNote();
  const permanentDeleteEntry = usePermanentDeleteJournalEntry();

  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: "note" | "journal_entry"; title: string } | null>(null);

  const allItems = [
    ...(data?.notes ?? []).map((n) => ({ ...n, restoreType: "note" as const })),
    ...(data?.entries ?? []).map((e) => ({ ...e, restoreType: "journal_entry" as const })),
  ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Trash</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-faint)" }}>
            {allItems.length} deleted items
          </p>
        </div>
        {allItems.length > 0 && (
          <button
            onClick={() => setShowEmptyConfirm(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: "var(--destructive)" }}
          >
            <Trash2 size={13} /> Empty Trash
          </button>
        )}
      </div>

      {isLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Trash2 size={40} style={{ color: "var(--text-faint)", opacity: 0.3 }} />
          <p className="mt-3" style={{ color: "var(--text-muted)" }}>Trash is empty.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 stagger-in">
          {allItems.map((item) => (
            <div
              key={`${item.restoreType}-${item.id}`}
              className="flex items-center justify-between rounded-[10px] p-4"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: "var(--elevated)", color: "var(--text-faint)" }}
                  >
                    {item.restoreType === "note" ? "Note" : "Journal"}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {item.title || "Untitled"}
                  </span>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
                  Deleted {formatDate(item.deletedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (item.restoreType === "note") restoreNote.mutate(item.id);
                    else restoreEntry.mutate(item.title);
                  }}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs btn-surface"
                  style={{ color: "var(--success)" }}
                >
                  <RotateCcw size={13} /> Restore
                </button>
                <button
                  onClick={() => setDeleteItem({ id: item.id, type: item.restoreType, title: item.title || "Untitled" })}
                  className="rounded-lg p-1.5 transition-colors duration-150"
                  style={{ color: "var(--text-faint)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
                  aria-label="Delete permanently"
                  title="Delete permanently"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={showEmptyConfirm}
        title="Empty trash"
        description={`Permanently delete all ${allItems.length} items? This cannot be undone.`}
        confirmLabel="Delete All"
        destructive
        onConfirm={() => { emptyTrash.mutate(); setShowEmptyConfirm(false); }}
        onCancel={() => setShowEmptyConfirm(false)}
      />

      <ConfirmDialog
        open={!!deleteItem}
        title="Delete permanently"
        description={`Permanently delete "${deleteItem?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteItem) {
            if (deleteItem.type === "note") permanentDeleteNote.mutate(deleteItem.id);
            else permanentDeleteEntry.mutate(deleteItem.title);
          }
          setDeleteItem(null);
        }}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
