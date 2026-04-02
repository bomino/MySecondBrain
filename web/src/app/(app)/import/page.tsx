"use client";

import { useState, useCallback } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/stores/toast-store";

interface ImportResult {
  file: string;
  status: "imported" | "skipped";
  noteId?: string;
  reason?: string;
}

export default function ImportPage() {
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setImporting(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/v1/import/markdown", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResults(data.results ?? []);
      toast(`Imported ${data.imported ?? 0} notes`, "success");
    } catch {
      toast("Import failed", "error");
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <h1 className="mb-2 text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Import Notes</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Upload .md, .markdown, or .txt files to import as notes.
      </p>

      <div
        className="flex flex-col items-center justify-center rounded-[10px] border-2 border-dashed p-12 transition-colors duration-150"
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--border)",
          backgroundColor: dragOver ? "var(--accent-muted)" : "var(--surface)",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload size={32} style={{ color: "var(--text-faint)", opacity: 0.5 }} />
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          Drag and drop files here, or
        </p>
        <label className="mt-2 cursor-pointer rounded-lg px-4 py-2 text-sm btn-accent">
          Browse Files
          <input
            type="file"
            multiple
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </label>
      </div>

      {importing && (
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>Importing...</p>
      )}

      {results.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 stagger-in">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg p-3"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {r.status === "imported" ? (
                <CheckCircle size={16} style={{ color: "var(--success)" }} />
              ) : (
                <AlertCircle size={16} style={{ color: "var(--text-faint)" }} />
              )}
              <div className="flex-1">
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{r.file}</span>
                {r.reason && (
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>{r.reason}</p>
                )}
              </div>
              <span className="text-xs" style={{ color: r.status === "imported" ? "var(--success)" : "var(--text-faint)" }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
