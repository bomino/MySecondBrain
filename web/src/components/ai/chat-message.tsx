"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { ChatMarkdown } from "./chat-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`mb-4 fade-in ${role === "user" ? "flex justify-end" : ""}`}>
      <div
        className="group relative inline-block max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
        style={
          role === "user"
            ? { background: "var(--gradient-accent)", color: "white", borderBottomRightRadius: "4px" }
            : { backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderBottomLeftRadius: "4px" }
        }
      >
        {role === "assistant" && content && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            style={{ color: "var(--text-faint)", backgroundColor: "var(--background)" }}
            aria-label="Copy message"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
        {role === "assistant" ? (
          <ChatMarkdown content={content} />
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sources.map((s) => {
            const href = s.type === "note" ? `/notes/${s.id}` : `/journal/${s.title}`;
            return (
              <Link
                key={`${s.type}-${s.id}`}
                href={href}
                className="rounded-md px-2 py-0.5 text-[11px] transition-colors duration-150"
                style={{
                  backgroundColor: "var(--accent-muted)",
                  color: "var(--accent)",
                  border: "1px solid rgba(217,119,6,0.2)",
                }}
              >
                {s.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
