# AI Chat Enhancements (Batch 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conversation management (rename, search), response iteration (regenerate), guided exploration (follow-up suggestions), and data export to the AI Chat.

**Architecture:** Five enhancements layered: backend endpoints first (rename PATCH, search query param, message DELETE), then sidecar follow-up generation, then frontend UI for all five. Each enhancement is independently testable.

**Tech Stack:** Next.js API Routes (Prisma), FastAPI (SSE), React (Lucide icons, TanStack Query), Vitest, pytest

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `web/src/app/api/v1/ai/conversations/[id]/messages/[messageId]/route.ts` | DELETE handler for individual messages (regenerate) |

### Modified files
| File | Changes |
|------|---------|
| `web/src/app/api/v1/ai/conversations/[id]/route.ts` | Add PATCH handler for rename |
| `web/src/app/api/v1/ai/conversations/route.ts` | Add `search` query param to GET |
| `web/src/hooks/use-ai-chat.ts` | Add `renameConversation`, `regenerateLastResponse`; update `useConversations` for search; handle suggestions |
| `web/src/lib/sse-reader.ts` | Add `suggestions` event type + `onSuggestions` callback |
| `web/src/components/ai/chat-message.tsx` | Add regenerate button; accept `isLast` and `onRegenerate` props |
| `web/src/components/ai/chat-panel.tsx` | Inline rename, search input, suggestion chips, export dropdown, pass `isLast`/`onRegenerate` |
| `ai-sidecar/src/services/llm_stream.py` | Add `format_sse_suggestions()` helper |
| `ai-sidecar/src/services/rag.py` | Generate follow-up suggestions in `chat_stream` |
| `ai-sidecar/tests/test_llm_stream.py` | Test for `format_sse_suggestions` |

---

## Task 1: Conversation Rename API (PATCH)

**Files:**
- Modify: `web/src/app/api/v1/ai/conversations/[id]/route.ts`

- [ ] **Step 1: Add PATCH handler**

Add to `web/src/app/api/v1/ai/conversations/[id]/route.ts` after the existing DELETE handler:

```typescript
const renameSchema = z.object({
  title: z.string().min(1).max(100),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id } = await params;

  const existing = await db.chatConversation.findFirst({ where: { id, userId: user.id! } });
  if (!existing) return notFound("Conversation");

  const body = await req.json();
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid title", parsed.error.flatten());

  const updated = await db.chatConversation.update({
    where: { id },
    data: { title: parsed.data.title },
  });

  return success(updated);
}
```

Add the `z` import at the top:

```typescript
import { z } from "zod";
```

And add `badRequest` to the existing import:

```typescript
import { success, notFound, unauthorized, badRequest } from "@/lib/api-response";
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/api/v1/ai/conversations/[id]/route.ts
git commit -m "feat(api): PATCH endpoint for conversation rename"
```

---

## Task 2: Conversation Search API

**Files:**
- Modify: `web/src/app/api/v1/ai/conversations/route.ts`

- [ ] **Step 1: Add search query param to GET handler**

Replace the GET handler in `web/src/app/api/v1/ai/conversations/route.ts`:

```typescript
export async function GET(req: NextRequest) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";

  const where: Record<string, unknown> = { userId: user.id! };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { messages: { some: { content: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const conversations = await db.chatConversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
    take: 50,
  });

  return success(conversations);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/api/v1/ai/conversations/route.ts
git commit -m "feat(api): search conversations by title and message content"
```

---

## Task 3: Message Delete API (for Regenerate)

**Files:**
- Create: `web/src/app/api/v1/ai/conversations/[id]/messages/[messageId]/route.ts`

- [ ] **Step 1: Create the route file**

First check directory exists:
```bash
ls web/src/app/api/v1/ai/conversations/[id]/messages/
```

Create `web/src/app/api/v1/ai/conversations/[id]/messages/[messageId]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized, badRequest } from "@/lib/api-response";

type Params = { params: Promise<{ id: string; messageId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try { user = await requireAuth(); } catch { return unauthorized(); }
  const { id, messageId } = await params;

  const conversation = await db.chatConversation.findFirst({ where: { id, userId: user.id! } });
  if (!conversation) return notFound("Conversation");

  const message = await db.chatMessage.findFirst({
    where: { id: messageId, conversationId: id },
  });
  if (!message) return notFound("Message");

  if (message.role !== "assistant") {
    return badRequest("Only assistant messages can be deleted for regeneration");
  }

  await db.chatMessage.delete({ where: { id: messageId } });
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 2: Commit**

```bash
git add "web/src/app/api/v1/ai/conversations/[id]/messages/[messageId]/route.ts"
git commit -m "feat(api): DELETE endpoint for individual chat messages (regenerate)"
```

---

## Task 4: SSE Suggestions Event (Sidecar)

**Files:**
- Modify: `ai-sidecar/src/services/llm_stream.py`
- Modify: `ai-sidecar/tests/test_llm_stream.py`

- [ ] **Step 1: Write test for format_sse_suggestions**

Append to `ai-sidecar/tests/test_llm_stream.py`:

```python
from services.llm_stream import format_sse_suggestions


def test_format_sse_suggestions():
    # #given
    suggestions = ["What else did I write?", "Tell me more about that", "Any related notes?"]

    # #when
    result = format_sse_suggestions(suggestions)

    # #then
    assert "event: suggestions" in result
    assert '"suggestions"' in result
    assert "What else did I write?" in result
    assert "Tell me more about that" in result
    assert "Any related notes?" in result


def test_format_sse_suggestions_empty():
    # #when
    result = format_sse_suggestions([])

    # #then
    assert "event: suggestions" in result
    assert '"suggestions": []' in result
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ai-sidecar && python -m pytest tests/test_llm_stream.py::test_format_sse_suggestions -v`
Expected: FAIL — `format_sse_suggestions` not found

- [ ] **Step 3: Implement format_sse_suggestions**

Add to `ai-sidecar/src/services/llm_stream.py` after `format_sse_error`:

```python
def format_sse_suggestions(suggestions: list[str]) -> str:
    return f"event: suggestions\ndata: {json.dumps({'suggestions': suggestions})}\n\n"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ai-sidecar && python -m pytest tests/test_llm_stream.py -v`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add ai-sidecar/src/services/llm_stream.py ai-sidecar/tests/test_llm_stream.py
git commit -m "feat(ai): SSE suggestions event formatter"
```

---

## Task 5: Generate Follow-up Suggestions in chat_stream

**Files:**
- Modify: `ai-sidecar/src/services/rag.py`

- [ ] **Step 1: Add FOLLOWUP_PROMPT constant and suggestion generation**

Add after the `NO_CONTEXT_SYSTEM_PROMPT` in `ai-sidecar/src/services/rag.py`:

```python
FOLLOWUP_PROMPT = """Based on the answer you just gave and the context provided, suggest exactly 3 short follow-up questions the user might ask next. Return ONLY the questions, one per line, no numbering or bullets."""
```

Add the `format_sse_suggestions` import to the existing import line:

```python
from services.llm_stream import generate_text_stream, format_sse_token, format_sse_sources, format_sse_done, format_sse_error, format_sse_suggestions
```

- [ ] **Step 2: Add _generate_followups helper function**

Add after `build_multi_turn_prompt` in `ai-sidecar/src/services/rag.py`:

```python
async def _generate_followups(answer: str, query: str, provider: str, config: dict | None = None) -> list[str]:
    try:
        prompt = f"User asked: {query}\n\nYour answer: {answer[:500]}\n\n{FOLLOWUP_PROMPT}"
        raw = await generate_text(prompt, "You are a helpful assistant.", provider, config)
        lines = [line.strip() for line in raw.strip().split("\n") if line.strip()]
        return lines[:3]
    except Exception:
        logger.warning("Failed to generate follow-up suggestions")
        return []
```

- [ ] **Step 3: Wire suggestions into chat_stream**

In `chat_stream`, we need to collect the full answer as it streams so we can generate follow-ups. Modify `chat_stream` in `ai-sidecar/src/services/rag.py`.

For the **no-context path** (around lines 184-189), replace:

```python
            async for token in generate_text_stream(prompt, system, provider, config):
                yield format_sse_token(token)

            yield format_sse_sources([], provider, False)
            yield format_sse_done()
            return
```

With:

```python
            collected_answer = []
            async for token in generate_text_stream(prompt, system, provider, config):
                collected_answer.append(token)
                yield format_sse_token(token)

            yield format_sse_sources([], provider, False)

            followups = await _generate_followups("".join(collected_answer), query, provider, config)
            if followups:
                yield format_sse_suggestions(followups)

            yield format_sse_done()
            return
```

For the **has-context path** (around lines 227-243), replace:

```python
        async for token in generate_text_stream(prompt, system, provider, config):
            yield format_sse_token(token)

        sources = []
        seen = set()
        for c in chunks:
            key = f"{c['entity_type']}:{c['entity_id']}"
            if key not in seen:
                seen.add(key)
                sources.append({
                    "type": c["entity_type"],
                    "id": str(c["entity_id"]),
                    "title": c.get("title", "Unknown"),
                    "similarity": float(c["similarity"]),
                })

        yield format_sse_sources(sources, provider, has_sensitive)
        yield format_sse_done()
```

With:

```python
        collected_answer = []
        async for token in generate_text_stream(prompt, system, provider, config):
            collected_answer.append(token)
            yield format_sse_token(token)

        sources = []
        seen = set()
        for c in chunks:
            key = f"{c['entity_type']}:{c['entity_id']}"
            if key not in seen:
                seen.add(key)
                sources.append({
                    "type": c["entity_type"],
                    "id": str(c["entity_id"]),
                    "title": c.get("title", "Unknown"),
                    "similarity": float(c["similarity"]),
                })

        yield format_sse_sources(sources, provider, has_sensitive)

        followups = await _generate_followups("".join(collected_answer), query, provider, config)
        if followups:
            yield format_sse_suggestions(followups)

        yield format_sse_done()
```

- [ ] **Step 4: Run all sidecar tests**

Run: `cd ai-sidecar && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add ai-sidecar/src/services/rag.py
git commit -m "feat(ai): generate follow-up suggestions in streaming chat

After streaming the main answer, makes a quick LLM call to generate
2-3 follow-up questions. Emits as 'suggestions' SSE event. Failures
are logged and silently skipped."
```

---

## Task 6: Frontend SSE Suggestions Support

**Files:**
- Modify: `web/src/lib/sse-reader.ts`
- Modify: `web/__tests__/lib/sse-reader.test.ts`

- [ ] **Step 1: Write test for suggestions event**

Append to `web/__tests__/lib/sse-reader.test.ts`:

```typescript
  it("should parse suggestions event", () => {
    // #given
    const lines = [
      "event: suggestions",
      'data: {"suggestions": ["Question 1?", "Question 2?", "Question 3?"]}',
    ];

    // #when
    const result = parseSSELine(lines);

    // #then
    expect(result?.event).toBe("suggestions");
    expect(result?.data.suggestions).toEqual(["Question 1?", "Question 2?", "Question 3?"]);
  });
```

- [ ] **Step 2: Add onSuggestions to StreamCallbacks**

Modify `web/src/lib/sse-reader.ts`. Update `StreamCallbacks`:

```typescript
export interface StreamCallbacks {
  onToken: (text: string) => void;
  onSources: (sources: { type: string; id: string; title: string }[], routedTo: string) => void;
  onSuggestions: (suggestions: string[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
}
```

Add the `suggestions` case to the switch in `readSSEStream`:

```typescript
          case "suggestions":
            callbacks.onSuggestions(parsed.data.suggestions as string[]);
            break;
```

- [ ] **Step 3: Run tests**

Run: `cd web && npx vitest run __tests__/lib/sse-reader.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/sse-reader.ts web/__tests__/lib/sse-reader.test.ts
git commit -m "feat(ui): handle suggestions SSE event in stream reader"
```

---

## Task 7: Hook Updates — Rename, Search, Regenerate, Suggestions

**Files:**
- Modify: `web/src/hooks/use-ai-chat.ts`

- [ ] **Step 1: Add suggestions to ChatMessage interface**

In `web/src/hooks/use-ai-chat.ts`, update the `ChatMessage` interface:

```typescript
interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
  suggestions?: string[];
}
```

- [ ] **Step 2: Update useConversations to accept search param**

Replace `useConversations`:

```typescript
export function useConversations(search?: string) {
  return useQuery({
    queryKey: ["conversations", search ?? ""],
    queryFn: async () => {
      const url = search
        ? `/api/v1/ai/conversations?search=${encodeURIComponent(search)}`
        : "/api/v1/ai/conversations";
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json() as Promise<Conversation[]>;
    },
  });
}
```

- [ ] **Step 3: Add onSuggestions handler to sendMessage**

In the `readSSEStream` call inside `sendMessage`, add the `onSuggestions` callback after `onSources`:

```typescript
        onSuggestions: (suggestions) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, suggestions };
            }
            return updated;
          });
        },
```

- [ ] **Step 4: Add renameConversation method**

Add after `clearAllConversations` in `useAIChat`:

```typescript
  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/v1/ai/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      toast("Failed to rename conversation", "error");
    }
  }, [queryClient]);
```

- [ ] **Step 5: Add regenerateLastResponse method**

Add after `renameConversation`:

```typescript
  const regenerateLastResponse = useCallback(async () => {
    const convId = activeConversationId;
    if (!convId) return;

    const currentMessages = messagesRef.current;
    const lastAssistant = [...currentMessages].reverse().find((m) => m.role === "assistant");
    const lastUser = [...currentMessages].reverse().find((m) => m.role === "user");
    if (!lastAssistant || !lastUser) return;

    if (lastAssistant.id) {
      fetch(`/api/v1/ai/conversations/${convId}/messages/${lastAssistant.id}`, {
        method: "DELETE",
      }).catch(() => {});
    }

    setMessages((prev) => prev.filter((m) => m !== lastAssistant));
    await sendMessage(lastUser.content);
  }, [activeConversationId, sendMessage]);
```

- [ ] **Step 6: Update return object**

Add `renameConversation` and `regenerateLastResponse` to the return object:

```typescript
  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    activeConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation,
    clearAllConversations,
    renameConversation,
    regenerateLastResponse,
  };
```

- [ ] **Step 7: Verify TypeScript**

Run: `cd web && npx tsc --noEmit 2>&1 | grep use-ai-chat`
Expected: No errors in use-ai-chat.ts

- [ ] **Step 8: Commit**

```bash
git add web/src/hooks/use-ai-chat.ts
git commit -m "feat(ui): hook updates — rename, search, regenerate, suggestions

- useConversations accepts optional search param
- renameConversation PATCH method
- regenerateLastResponse deletes + re-sends
- onSuggestions handler attaches follow-ups to messages"
```

---

## Task 8: ChatMessage — Regenerate Button

**Files:**
- Modify: `web/src/components/ai/chat-message.tsx`

- [ ] **Step 1: Add isLast and onRegenerate props**

Update the interface and component in `web/src/components/ai/chat-message.tsx`:

```typescript
interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
  isLast?: boolean;
  onRegenerate?: () => void;
}

export function ChatMessage({ role, content, sources, isLast, onRegenerate }: ChatMessageProps) {
```

- [ ] **Step 2: Add RefreshCw icon import and regenerate button**

Add `RefreshCw` to the lucide import:

```typescript
import { Copy, Check, RefreshCw } from "lucide-react";
```

Add the regenerate button next to the copy button (inside the assistant message bubble, after the copy button):

```tsx
        {role === "assistant" && content && (
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="rounded p-1"
              style={{ color: "var(--text-faint)", backgroundColor: "var(--background)" }}
              aria-label="Copy message"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="rounded p-1"
                style={{ color: "var(--text-faint)", backgroundColor: "var(--background)" }}
                aria-label="Regenerate response"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        )}
```

Remove the old standalone copy button (the single `<button>` with `absolute right-2 top-2`) and replace it with the div above that groups both buttons.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ai/chat-message.tsx
git commit -m "feat(ui): regenerate button on last assistant message"
```

---

## Task 9: ChatPanel — Search, Rename, Suggestions, Export, Regenerate Wiring

**Files:**
- Modify: `web/src/components/ai/chat-panel.tsx`

This is the largest frontend task. It wires everything together.

- [ ] **Step 1: Update imports and hook destructuring**

Replace the imports and hook usage at the top of `web/src/components/ai/chat-panel.tsx`:

```tsx
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
```

- [ ] **Step 2: Add debounce effect for search**

Add after the existing `useEffect` for scroll:

```tsx
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
```

- [ ] **Step 3: Add rename handlers**

Add after `handleSubmit`:

```tsx
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
```

- [ ] **Step 4: Add export handlers**

Add after rename handlers:

```tsx
  function handleExport(format: "markdown" | "json") {
    setShowExport(false);
    const activeConv = (conversations ?? []).find((c) => c.id === activeConversationId);
    const title = activeConv?.title ?? "conversation";
    const now = new Date().toISOString();

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
        exportedAt: now,
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
    a.download = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 50)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }
```

- [ ] **Step 5: Replace sidebar section**

Replace the entire sidebar div (from `<div className="w-52 flex-shrink-0` to its closing `</div>` at line 76):

```tsx
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
```

- [ ] **Step 6: Add export button and suggestion chips to main chat area**

Replace the main chat area div (from `<div className="flex flex-1 flex-col">` to the `</form>` closing):

```tsx
      <div className="flex flex-1 flex-col">
        {activeConversationId && messages.length > 0 && (
          <div className="flex items-center justify-end px-6 pt-3 pb-1">
            <div className="relative">
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
```

- [ ] **Step 7: Verify TypeScript**

Run: `cd web && npx tsc --noEmit 2>&1 | grep -E "chat-panel|chat-message|use-ai-chat|sse-reader"`
Expected: No errors in our files

- [ ] **Step 8: Commit**

```bash
git add web/src/components/ai/chat-panel.tsx
git commit -m "feat(ui): search, inline rename, suggestion chips, export dropdown

- Search input with 300ms debounce filters conversations
- Double-click conversation title for inline rename
- Suggestion chips below last assistant message
- Export dropdown (Markdown/JSON) for active conversation
- Regenerate button wired to last assistant message"
```

---

## Task 10: Full Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all sidecar tests**

Run: `cd ai-sidecar && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Run all frontend tests**

Run: `cd web && npx vitest run`
Expected: All our tests PASS (pre-existing failures are OK)

- [ ] **Step 3: Run TypeScript check**

Run: `cd web && npx tsc --noEmit`
Expected: No new errors in our files

- [ ] **Step 4: Docker rebuild**

Run: `docker-compose up -d --build web ai-sidecar`
Expected: Both containers start and become healthy

- [ ] **Step 5: Manual smoke test**

1. **Search**: Type in search box → verify conversations filter
2. **Rename**: Double-click title → edit → Enter → verify persisted on reload
3. **Regenerate**: Hover last assistant message → click refresh → verify new response streams
4. **Follow-ups**: After response, verify suggestion chips appear → click one → verify sends as message
5. **Export Markdown**: Click download → "Markdown" → verify file downloads correctly
6. **Export JSON**: Click download → "JSON" → verify file downloads correctly
