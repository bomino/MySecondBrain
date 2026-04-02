"use client";

import { useState } from "react";
import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { toast } from "@/stores/toast-store";

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);

  async function handleExportJson() {
    setExporting(true);
    try {
      const res = await fetch("/api/v1/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `second-brain-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Export downloaded", "success");
    } catch {
      toast("Export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <h1 className="mb-2 text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>
        Export Data
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
        Download your entire knowledge base. Individual notes can also be exported as markdown from the note editor.
      </p>

      <div className="flex flex-col gap-4">
        <div
          className="flex items-center justify-between rounded-[10px] p-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <FileJson size={24} style={{ color: "var(--accent)" }} />
            <div>
              <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Full JSON Export
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                All notes, journal entries, tags, links, and templates in a single JSON file
              </p>
            </div>
          </div>
          <button
            onClick={handleExportJson}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm btn-accent disabled:opacity-50"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {exporting ? "Exporting..." : "Download"}
          </button>
        </div>

        <div
          className="rounded-[10px] p-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <FileText size={24} style={{ color: "var(--text-faint)" }} />
            <div>
              <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Markdown Export
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Export individual notes as .md files from the note editor toolbar (Export button)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-8 rounded-[10px] p-4"
        style={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          What&apos;s included in the JSON export
        </h3>
        <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
          <li>All notes with full content, tags, sensitivity flags, and pin status</li>
          <li>All journal entries with mood, energy, and content</li>
          <li>All tags with colors</li>
          <li>All note-to-note links (wiki-links)</li>
          <li>All note templates</li>
          <li>Tag assignments across notes and journal entries</li>
        </ul>
      </div>
    </div>
  );
}
