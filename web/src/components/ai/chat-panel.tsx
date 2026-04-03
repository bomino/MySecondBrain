"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Plus, MessageSquare, Trash2 } from "lucide-react";
import { useAIChat, useConversations } from "@/hooks/use-ai-chat";
import { ChatMessage } from "./chat-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ChatPanel() {
  const { messages, isLoading, sendMessage, activeConversationId, loadConversation, startNewConversation, deleteConversation, clearAllConversations } = useAIChat();
  const { data: conversations } = useConversations();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

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
    <div className="flex h-full">
      <div className="w-52 flex-shrink-0 overflow-y-auto" style={{ borderRight: "1px solid var(--border)" }}>
        <div className="p-3">
          <button
            onClick={startNewConversation}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs btn-accent"
          >
            <Plus size={14} /> New Chat
          </button>
        </div>
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {(conversations ?? []).map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors duration-100 nav-item cursor-pointer"
              onClick={() => loadConversation(c.id)}
              style={{
                color: activeConversationId === c.id ? "var(--accent-light)" : "var(--text-secondary)",
                backgroundColor: activeConversationId === c.id ? "var(--accent-muted)" : "transparent",
              }}
            >
              <MessageSquare size={13} />
              <span className="flex-1 truncate">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                className="rounded p-0.5 transition-colors duration-100"
                style={{ color: "var(--text-faint)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
                aria-label="Delete conversation"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        {(conversations ?? []).length > 0 && (
          <div className="px-3 pb-2">
            <button
              onClick={() => setShowClearAll(true)}
              className="w-full rounded-lg py-1.5 text-[10px] transition-colors duration-150"
              style={{ color: "var(--destructive)" }}
            >
              Clear All ({(conversations ?? []).length})
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-6" role="log" aria-live="polite">
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
                    onClick={() => setInput(suggestion)}
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
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] btn-accent disabled:opacity-50"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete conversation"
        description="This conversation and all its messages will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteId) deleteConversation(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={showClearAll}
        title="Clear all conversations"
        description={`Permanently delete all ${(conversations ?? []).length} conversations? This cannot be undone.`}
        confirmLabel="Clear All"
        destructive
        onConfirm={() => { clearAllConversations(); setShowClearAll(false); }}
        onCancel={() => setShowClearAll(false)}
      />
    </div>
  );
}
