"use client";

import { useState, useEffect, useRef } from "react";

interface LinkPickerProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (title: string) => void;
  onClose: () => void;
}

export function LinkPicker({ query, position, onSelect, onClose }: LinkPickerProps) {
  const [results, setResults] = useState<{ id: string; title: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) return;

    const controller = new AbortController();
    fetch(`/api/v1/notes?search=${encodeURIComponent(query)}&limit=5`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setResults(data.data ?? []))
      .catch(() => {});

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        onSelect(results[selectedIndex].title);
      } else if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIndex, onSelect, onClose]);

  if (results.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 w-64 rounded border bg-white shadow-lg dark:bg-gray-800"
      style={{ top: position.top, left: position.left }}
    >
      {results.map((r, i) => (
        <button
          key={r.id}
          className={`w-full px-3 py-2 text-left text-sm ${
            i === selectedIndex ? "bg-indigo-50 dark:bg-indigo-900" : ""
          }`}
          onClick={() => onSelect(r.title)}
        >
          {r.title || "Untitled"}
        </button>
      ))}
    </div>
  );
}
