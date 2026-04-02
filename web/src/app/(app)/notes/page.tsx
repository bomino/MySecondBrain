"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, List, Globe, ArrowUpDown, Upload, ChevronDown, FileText } from "lucide-react";
import { useNotes, useCreateNote } from "@/hooks/use-notes";
import { useTemplates } from "@/hooks/use-templates";
import { NoteList } from "@/components/notes/note-list";
import { NoteGraph } from "@/components/notes/note-graph";
import { NoteListSkeleton } from "@/components/ui/skeleton";

export default function NotesPage() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "graph">("list");
  const [sort, setSort] = useState<"recent" | "title" | "created">("recent");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const { data, isLoading } = useNotes({ sort });
  const createNote = useCreateNote();
  const { data: templates } = useTemplates();

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
            onClick={() => setSort(sort === "recent" ? "title" : sort === "title" ? "created" : "recent")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-surface"
          >
            <ArrowUpDown size={14} />
            {sort === "recent" ? "Recent" : sort === "title" ? "A-Z" : "Created"}
          </button>
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
          <Link href="/import" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-surface">
            <Upload size={14} /> Import
          </Link>
          <div className="relative">
            <button onClick={() => setShowNewMenu(!showNewMenu)} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] btn-accent">
              <Plus size={14} /> New Note <ChevronDown size={12} />
            </button>
            {showNewMenu && (
              <div
                className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg p-2 shadow-lg"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <button
                  onClick={async () => {
                    setShowNewMenu(false);
                    const result = await createNote.mutateAsync({ title: "Untitled" });
                    router.push(`/notes/${result.id}`);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-100 nav-item"
                  style={{ color: "var(--text-primary)" }}
                >
                  <FileText size={14} /> Blank note
                </button>
                {(templates ?? []).length > 0 && (
                  <>
                    <div className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
                    <p className="px-3 py-1 text-[10px] font-medium uppercase" style={{ color: "var(--text-faint)" }}>From template</p>
                    {(templates ?? []).map((t) => (
                      <button
                        key={t.id}
                        onClick={async () => {
                          setShowNewMenu(false);
                          const tmpl = await fetch(`/api/v1/templates/${t.id}`).then((r) => r.json());
                          const result = await createNote.mutateAsync({ title: t.name, content: tmpl.content });
                          router.push(`/notes/${result.id}`);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-100 nav-item"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <FileText size={14} /> {t.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? <NoteListSkeleton /> : view === "graph" ? <NoteGraph /> : <NoteList notes={data?.data ?? []} />}
    </div>
  );
}
