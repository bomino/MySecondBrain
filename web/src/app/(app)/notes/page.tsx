"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotes, useCreateNote } from "@/hooks/use-notes";
import { NoteList } from "@/components/notes/note-list";
import { NoteGraph } from "@/components/notes/note-graph";

export default function NotesPage() {
  const router = useRouter();
  const { data, isLoading } = useNotes();
  const createNote = useCreateNote();
  const [view, setView] = useState<"list" | "graph">("list");

  async function handleCreate() {
    const result = await createNote.mutateAsync({ title: "Untitled" });
    router.push(`/notes/${result.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notes</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setView("list")}
              className={`rounded px-3 py-1 text-sm ${view === "list" ? "bg-gray-200 dark:bg-gray-700" : ""}`}
            >
              List
            </button>
            <button
              onClick={() => setView("graph")}
              className={`rounded px-3 py-1 text-sm ${view === "graph" ? "bg-gray-200 dark:bg-gray-700" : ""}`}
            >
              Graph
            </button>
          </div>
          <button
            onClick={handleCreate}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            New Note
          </button>
        </div>
      </div>
      {view === "graph" ? (
        <NoteGraph />
      ) : isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <NoteList notes={data?.data ?? []} />
      )}
    </div>
  );
}
