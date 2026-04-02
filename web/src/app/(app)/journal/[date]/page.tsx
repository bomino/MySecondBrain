"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { useJournalEntry, useCreateJournalEntry, useUpdateJournalEntry } from "@/hooks/use-journal";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { MoodPicker } from "@/components/journal/mood-picker";

export default function JournalEntryPage() {
  const { date } = useParams<{ date: string }>();
  const { data: entry, isLoading } = useJournalEntry(date);
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();

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
        await createEntry.mutateAsync({ date, mood: mood ?? undefined });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  const handleEnergyChange = useCallback(
    async (energy: number | null) => {
      if (entry) {
        updateEntry.mutate({ date, energy });
      } else {
        await createEntry.mutateAsync({ date, energy: energy ?? undefined });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">{date}</h1>
      <div className="mb-4 flex gap-4">
        <MoodPicker label="Mood" value={entry?.mood ?? null} onChange={handleMoodChange} />
        <MoodPicker label="Energy" value={entry?.energy ?? null} onChange={handleEnergyChange} />
      </div>
      <TiptapEditor
        content={(entry?.content as Record<string, unknown>) ?? { type: "doc", content: [] }}
        onUpdate={handleContentUpdate}
        placeholder="How was your day?"
      />
    </div>
  );
}
