"use client";

import { useRouter } from "next/navigation";
import { useNotes, useCreateNote } from "@/hooks/use-notes";
import { NoteList } from "@/components/notes/note-list";

export default function NotesPage() {
  const router = useRouter();
  const { data, isLoading } = useNotes();
  const createNote = useCreateNote();

  async function handleCreate() {
    const result = await createNote.mutateAsync({ title: "Untitled" });
    router.push(`/notes/${result.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notes</h1>
        <button
          onClick={handleCreate}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          New Note
        </button>
      </div>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <NoteList notes={data?.data ?? []} />
      )}
    </div>
  );
}
