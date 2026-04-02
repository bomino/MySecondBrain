"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { useJournalEntry, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry } from "@/hooks/use-journal";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { MoodPicker } from "@/components/journal/mood-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function JournalEntryPage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const { data: entry, isLoading } = useJournalEntry(date);
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const [showDelete, setShowDelete] = useState(false);

  const handleContentUpdate = useCallback(
    async (content: Record<string, unknown>) => {
      if (entry) {
        updateEntry.mutate({ date, content });
      } else {
        await createEntry.mutateAsync({ date, content });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  const handleMoodChange = useCallback(
    async (mood: number | null) => {
      if (entry) {
        updateEntry.mutate({ date, mood });
      } else {
        await createEntry.mutateAsync({ date, mood });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  const handleEnergyChange = useCallback(
    async (energy: number | null) => {
      if (entry) {
        updateEntry.mutate({ date, energy });
      } else {
        await createEntry.mutateAsync({ date, energy });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  const handleToggleSensitive = useCallback(() => {
    if (entry) {
      updateEntry.mutate({ date, isSensitive: !entry.isSensitive });
    }
  }, [date, entry, updateEntry]);

  const handleDelete = useCallback(() => {
    deleteEntry.mutate(date, { onSuccess: () => router.push("/journal") });
    setShowDelete(false);
  }, [date, deleteEntry, router]);

  if (isLoading) return <p className="p-8" style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>{date}</h1>
          {entry && (
            <button
              onClick={handleToggleSensitive}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs btn-surface"
              title={entry.isSensitive ? "Mark as non-sensitive" : "Mark as sensitive"}
              aria-label={entry.isSensitive ? "Mark as non-sensitive" : "Mark as sensitive"}
            >
              {entry.isSensitive ? <Lock size={12} style={{ color: "var(--destructive)" }} /> : <Unlock size={12} />}
            </button>
          )}
        </div>
        {entry && (
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs btn-surface"
            style={{ color: "var(--destructive)" }}
            aria-label="Delete journal entry"
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-6">
        <MoodPicker label="Mood" value={entry?.mood ?? null} onChange={handleMoodChange} />
        <MoodPicker label="Energy" value={entry?.energy ?? null} onChange={handleEnergyChange} />
      </div>

      <TiptapEditor
        content={(entry?.content as Record<string, unknown>) ?? { type: "doc", content: [] }}
        onUpdate={handleContentUpdate}
        placeholder="How was your day?"
      />

      <ConfirmDialog
        open={showDelete}
        title="Delete journal entry"
        description={`Delete your journal entry for ${date}? This action can be undone by an admin.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
