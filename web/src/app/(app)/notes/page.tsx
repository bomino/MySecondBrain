"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, List, Globe } from "lucide-react";
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
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Notes</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-faint)" }}>
            {data?.total ?? 0} notes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-surface ${view === "list" ? "!border-[var(--border-hover)]" : ""}`}
          >
            <List size={14} /> List
          </button>
          <button
            onClick={() => setView("graph")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-surface ${view === "graph" ? "!border-[var(--border-hover)]" : ""}`}
          >
            <Globe size={14} /> Graph
          </button>
          <button onClick={handleCreate} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] btn-accent">
            <Plus size={14} /> New Note
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : view === "graph" ? (
        <NoteGraph />
      ) : (
        <NoteList notes={data?.data ?? []} />
      )}
    </div>
  );
}
