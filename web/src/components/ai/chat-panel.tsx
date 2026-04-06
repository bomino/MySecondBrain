"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Plus, MessageSquare, Trash2, Search, Download } from "lucide-react";
import { useAIChat, useConversations } from "@/hooks/use-ai-chat";
import { ChatMessage } from "./chat-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ChatPanel() {
  const {
    messages, isLoading, sendMessage, activeConversationId,
    loadConversation, startNewConversation, deleteConversation,
    clearAllConversations, renameConversation, regenerateLastResponse,
  } = useAIChat();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: conversations } = useConversations(debouncedSearch || undefined);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  }

  function handleRenameStart(id: string, currentTitle: string) {
    setEditingId(id);
    setEditTitle(currentTitle);
  }

  function handleRenameSubmit(id: string) {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed.length <= 100) {
      renameConversation(id, trimmed);
    }
    setEditingId(null);
  }

  function handleRenameCancel() {
    setEditingId(null);
  }

  function handleExport(format: "markdown" | "json") {
    setShowExport(false);
    const activeConv = (conversations ?? []).find((c) => c.id === activeConversationId);
    const title = activeConv?.title ?? "conversation";

    let content: string;
    let ext: string;
    let mime: string;

    if (format === "markdown") {
      ext = "md";
      mime = "text/markdown";
      const lines = [`# ${title}`, "", `*Exported on ${new Date().toLocaleDateString()}*`, "", "---", ""];
      for (const msg of messages) {
        const role = msg.role === "user" ? "You" : "Assistant";
        lines.push(`**${role}**:`, msg.content, "");
        if (msg.sources?.length) {
          lines.push(`Sources: ${msg.sources.map((s) => `[${s.title}]`).join(", ")}`, "");
        }
        lines.push("---", "");
      }
      content = lines.join("\n");
    } else {
      ext = "json";
      mime = "application/json";
      content = JSON.stringify({
        title,
        exportedAt: new Date().toISOString(),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources,
        })),
      }, null, 2);
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 50) || "conversation";
    a.download = `${safeName}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full">
      <div className="w-52 flex-shrink-0 overflow-y-auto" style={{ borderRight: "1px solid var(--border)" }}>
        <div className="p-3 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg py-1.5 pl-8 pr-2 text-[11px] input-base"
            />
          </div>
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
              onClick={() => editingId !== c.id && loadConversation(c.id)}
              onDoubleClick={() => handleRenameStart(c.id, c.title)}
              style={{
                color: activeConversationId === c.id ? "var(--accent-light)" : "var(--text-secondary)",
                backgroundColor: activeConversationId === c.id ? "var(--accent-muted)" : "transparent",
              }}
            >
              <MessageSquare size={13} />
              {editingId === c.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(c.id);
                    if (e.key === "Escape") handleRenameCancel();
                  }}
                  onBlur={() => handleRenameCancel()}
                  className="flex-1 rounded px-1 py-0.5 text-xs input-base"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate">{c.title}</span>
              )}
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
        {activeConversationId && messages.length > 0 && (
          <div className="flex items-center justify-end px-6 pt-3 pb-1">
            <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowExport(false); }}>
              <button
                onClick={() => setShowExport(!showExport)}
                className="rounded p-1.5 transition-colors duration-150"
                style={{ color: "var(--text-faint)" }}
                aria-label="Export conversation"
              >
                <Download size={14} />
              </button>
              {showExport && (
                <div
                  className="absolute right-0 top-full mt-1 rounded-lg py-1 shadow-lg z-10"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", minWidth: "140px" }}
                >
                  <button
                    onClick={() => handleExport("markdown")}
                    className="w-full px-3 py-1.5 text-left text-xs transition-colors duration-100"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    Markdown
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full px-3 py-1.5 text-left text-xs transition-colors duration-100"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-muted)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
          {messages.map((msg, i) => {
            const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;
            return (
              <div key={msg.id ?? i}>
                <ChatMessage
                  {...msg}
                  isLast={isLastAssistant}
                  onRegenerate={isLastAssistant ? regenerateLastResponse : undefined}
                />
                {isLastAssistant && msg.suggestions && msg.suggestions.length > 0 && !isLoading && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="rounded-lg px-3 py-1.5 text-xs transition-colors duration-150"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
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
