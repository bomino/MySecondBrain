"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { ChatMessage } from "./chat-message";

export function ChatPanel() {
  const { messages, isLoading, sendMessage } = useAIChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div role="log" aria-live="polite" className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Sparkles size={32} style={{ color: "var(--accent)", opacity: 0.4 }} />
            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              Ask anything about your notes and journal.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "What did I write about recently?",
                "Summarize my last journal entry",
                "Find notes about work",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs transition-colors duration-150"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
        {isLoading && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            <span className="inline-flex gap-1">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your second brain..."
          className="flex-1 rounded-[10px] px-4 py-2.5 text-sm input-base"
        />
        <button
          type="submit"
          disabled={isLoading}
          aria-label="Send message"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] btn-accent disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
