"use client";

import { useState } from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import { Wand2, Minimize2, Maximize2, FileText, Loader2 } from "lucide-react";

interface AiAssistMenuProps {
  editor: Editor;
}

const ACTIONS = [
  { key: "improve", label: "Improve", icon: Wand2 },
  { key: "simplify", label: "Simplify", icon: Minimize2 },
  { key: "expand", label: "Expand", icon: Maximize2 },
  { key: "summarize", label: "Summarize", icon: FileText },
] as const;

export function AiAssistMenu({ editor }: AiAssistMenuProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: string) {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (!selectedText.trim()) return;

    setLoading(action);
    try {
      const res = await fetch("/api/v1/ai/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText, action }),
      });

      if (res.ok) {
        const data = await res.json();
        editor.chain().focus().deleteSelection().insertContent(data.result).run();
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoading(null);
    }
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 150, placement: "top" }}
    >
      <div
        className="flex items-center gap-0.5 rounded-lg p-1 shadow-lg"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {ACTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleAction(key)}
            disabled={loading !== null}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-100"
            style={{ color: loading === key ? "var(--accent)" : "var(--text-secondary)" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "var(--elevated)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            title={label}
          >
            {loading === key ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
            {label}
          </button>
        ))}
      </div>
    </BubbleMenu>
  );
}
