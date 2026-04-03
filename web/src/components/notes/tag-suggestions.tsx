"use client";

import { Sparkles, Check, X } from "lucide-react";
import { useNoteSuggestions, useAcceptSuggestion, useDismissSuggestion } from "@/hooks/use-suggestions";

interface TagSuggestionsProps {
  noteId: string;
}

export function TagSuggestions({ noteId }: TagSuggestionsProps) {
  const { data: suggestions } = useNoteSuggestions(noteId);
  const acceptSuggestion = useAcceptSuggestion();
  const dismissSuggestion = useDismissSuggestion();

  const pending = (suggestions ?? []).filter(
    (s) => s.result?.suggested_tags && s.result.suggested_tags.length > 0
  );

  if (pending.length === 0) return null;

  const suggestion = pending[0];
  const tags = suggestion.result?.suggested_tags ?? [];

  return (
    <div
      className="mb-4 flex items-center gap-3 rounded-[10px] px-4 py-3 fade-in"
      style={{ backgroundColor: "var(--accent-muted)", border: "1px solid rgba(217,119,6,0.15)" }}
    >
      <Sparkles size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Suggested tags:</span>
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md px-2 py-0.5 text-xs"
            style={{ backgroundColor: "rgba(217,119,6,0.12)", color: "var(--accent-light)" }}
          >
            {tag}
          </span>
        ))}
      </div>
      <button
        onClick={() => acceptSuggestion.mutate(suggestion.id)}
        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150"
        style={{ color: "var(--success)" }}
        aria-label="Apply suggested tags"
      >
        <Check size={13} /> Apply
      </button>
      <button
        onClick={() => dismissSuggestion.mutate(suggestion.id)}
        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors duration-150"
        style={{ color: "var(--text-faint)" }}
        aria-label="Dismiss suggestion"
      >
        <X size={13} />
      </button>
    </div>
  );
}
