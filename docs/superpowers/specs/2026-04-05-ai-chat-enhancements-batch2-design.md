# AI Chat Enhancements Batch 2 — Design Spec

**Date**: 2026-04-05
**Scope**: Enhancements 6-10 (conversation renaming, search, regenerate, suggested follow-ups, export)
**Depends on**: Batch 1 (streaming, multi-turn, markdown, similarity threshold, copy button)

## Context

Batch 1 delivered the core chat UX (streaming, multi-turn context, markdown rendering). Batch 2 adds polish and power-user features: conversation management (rename, search), response iteration (regenerate), guided exploration (follow-ups), and data portability (export).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rename interaction | Double-click inline edit | Minimal UI, familiar pattern (VS Code, Finder) |
| Follow-up generation | Sidecar SSE event | Single round-trip, no extra API call |
| Export format | Both Markdown and JSON | User picks from dropdown; Markdown for readability, JSON for backup |

---

## Enhancement 6: Conversation Renaming

### Problem
Conversations are auto-titled from the first message (truncated to 50 chars). Users can't fix bad titles.

### Design

**Interaction flow**:
1. User double-clicks conversation title in sidebar
2. Title becomes an `<input>` pre-filled with current title, auto-focused and text-selected
3. Enter saves, Escape cancels, click-outside cancels
4. On save: PATCH `/api/v1/ai/conversations/[id]` with `{ title }`
5. On success: invalidate conversations query, show updated title
6. On failure: toast error, revert to original title

**Backend**:
- Add PATCH handler to `web/src/app/api/v1/ai/conversations/[id]/route.ts`
- Zod validation: `title` string, min 1 char, max 100 chars
- Only owner can rename (existing `requireAuth` + `userId` check)
- Returns updated conversation

**Frontend**:
- `chat-panel.tsx`: New state `editingId: string | null` and `editTitle: string`
- Double-click on conversation title sets `editingId`
- Render `<input>` when `editingId === c.id`, otherwise render `<span>`
- `use-ai-chat.ts`: New `renameConversation(id: string, title: string)` method

### Files to modify

| File | Change |
|------|--------|
| `web/src/app/api/v1/ai/conversations/[id]/route.ts` | Add PATCH handler |
| `web/src/hooks/use-ai-chat.ts` | Add `renameConversation` method |
| `web/src/components/ai/chat-panel.tsx` | Inline edit UI on double-click |

---

## Enhancement 7: Conversation Search

### Problem
As conversations accumulate, finding a past answer by scrolling is impractical.

### Design

**UX**: Search input above the "New Chat" button in the sidebar. Filters the conversation list as the user types (debounced 300ms).

**Backend**:
- Modify GET `/api/v1/ai/conversations` to accept `?search=term` query parameter
- Filter: `title` contains search term (case-insensitive) OR any message content contains search term
- Prisma query: `where: { OR: [{ title: { contains: term, mode: 'insensitive' } }, { messages: { some: { content: { contains: term, mode: 'insensitive' } } } }] }`
- Returns same response shape as current list

**Frontend**:
- `chat-panel.tsx`: Search input with `Search` icon (Lucide), above "New Chat" button
- Local state `searchTerm` with 300ms debounce before passing to hook
- `use-ai-chat.ts`: `useConversations` accepts optional `search` param, passes as query string
- Empty search returns all conversations (current behavior)

### Files to modify

| File | Change |
|------|--------|
| `web/src/app/api/v1/ai/conversations/route.ts` | Add `search` query param filter |
| `web/src/hooks/use-ai-chat.ts` | Update `useConversations` to accept search param |
| `web/src/components/ai/chat-panel.tsx` | Add search input, debounced state |

---

## Enhancement 8: Regenerate Response

### Problem
Sometimes the first LLM response isn't great. Users want to retry without manually re-typing.

### Design

**UX**: Refresh icon (Lucide `RefreshCw`, 14px) appears on hover next to the copy button on assistant messages. Only the last assistant message can be regenerated (to avoid conversation divergence).

**Interaction flow**:
1. User hovers over the last assistant message, clicks refresh icon
2. The assistant message is removed from UI and deleted from DB
3. The preceding user query is re-sent via `sendMessage`
4. New streaming response replaces the old one

**Backend**:
- New route: `web/src/app/api/v1/ai/conversations/[id]/messages/[messageId]/route.ts`
- DELETE handler: validates ownership, only allows deleting assistant messages, returns 204
- Ensures message belongs to the specified conversation

**Frontend**:
- `chat-message.tsx`: Add `RefreshCw` icon next to copy button (only when `isLast` prop is true and role is assistant)
- `chat-panel.tsx`: Pass `isLast` prop to the last assistant message
- `use-ai-chat.ts`: New `regenerateLastResponse()` method:
  1. Get last assistant message from state (needs message ID — ensure IDs flow from DB)
  2. DELETE `/api/v1/ai/conversations/[id]/messages/[messageId]`
  3. Remove assistant message from state
  4. Find preceding user message content
  5. Call `sendMessage(userQuery)` to re-stream

**Message IDs**: The conversation GET endpoint already includes messages via Prisma `include`. Messages have UUID `id` fields. The `ChatMessage` interface already has `id?: string`. Need to ensure IDs are populated when loading conversations.

### Files to modify

| File | Change |
|------|--------|
| `web/src/app/api/v1/ai/conversations/[id]/messages/[messageId]/route.ts` | New DELETE handler |
| `web/src/hooks/use-ai-chat.ts` | Add `regenerateLastResponse`, track message IDs |
| `web/src/components/ai/chat-message.tsx` | Add regenerate button (when `isLast`) |
| `web/src/components/ai/chat-panel.tsx` | Pass `isLast` prop to last assistant ChatMessage |

---

## Enhancement 9: Suggested Follow-ups

### Problem
After getting an answer, users often don't know what to ask next. Suggestions lower friction for multi-turn exploration.

### Design

**Sidecar changes**:
- After streaming the main answer, generate 2-3 follow-up questions
- Use a lightweight LLM call with a short prompt: "Given this answer and context, suggest 2-3 follow-up questions the user might ask. Return only the questions, one per line."
- Use the same provider that was used for the main answer
- Emit a new SSE event: `event: suggestions\ndata: {"suggestions": ["question1", "question2", "question3"]}`
- This event comes after `sources` and before `done`
- If follow-up generation fails, skip silently (don't block the main response)

**Frontend changes**:
- Add `suggestions?: string[]` to `ChatMessage` interface
- `sse-reader.ts`: Add `suggestions` case to `readSSEStream` switch
- `StreamCallbacks`: Add `onSuggestions(suggestions: string[])` callback
- `use-ai-chat.ts`: Handle `onSuggestions` — attach to last assistant message
- `chat-panel.tsx`: Render suggestion chips below the last assistant message's sources. Chips are clickable — clicking sends the suggestion as the next message. Only visible on the most recent assistant message.

**SSE event sequence**: `token* → sources → suggestions → done`

### Files to modify

| File | Change |
|------|--------|
| `ai-sidecar/src/services/rag.py` | Generate follow-ups after main answer in `chat_stream` |
| `ai-sidecar/src/services/llm_stream.py` | Add `format_sse_suggestions()` helper |
| `web/src/lib/sse-reader.ts` | Handle `suggestions` event type |
| `web/src/hooks/use-ai-chat.ts` | Handle `onSuggestions` callback |
| `web/src/components/ai/chat-panel.tsx` | Render suggestion chips |

---

## Enhancement 10: Export Conversation

### Problem
Users want to save conversations for external use — sharing, archiving, or importing to other tools.

### Design

**UX**: Download icon (Lucide `Download`, 14px) in the top-right of the main chat area (visible when a conversation is active). Clicking shows a small dropdown with two options: "Markdown" and "JSON".

**Implementation**: Pure client-side — no new API endpoints. The conversation data (messages, sources, timestamps) is already in state after loading.

**Markdown format**:
```markdown
# {conversation title}

*Exported on {date}*

---

**You** ({timestamp}):
{user message}

**Assistant** ({timestamp}):
{assistant message}

Sources: [{source1}], [{source2}]

---
```

**JSON format**:
```json
{
  "title": "conversation title",
  "exportedAt": "2026-04-05T...",
  "messages": [
    {
      "role": "user",
      "content": "...",
      "createdAt": "..."
    },
    {
      "role": "assistant",
      "content": "...",
      "sources": [...],
      "createdAt": "..."
    }
  ]
}
```

**Download mechanism**: Create `Blob` → `URL.createObjectURL` → trigger `<a>` click → revoke URL.

### Files to modify

| File | Change |
|------|--------|
| `web/src/components/ai/chat-panel.tsx` | Export button + dropdown, download logic |

---

## Verification Plan

### Per-enhancement testing

1. **Rename**: Double-click title → edit → Enter → verify title persisted on reload
2. **Search**: Type in search box → verify filtered results match title/content, clear search restores all
3. **Regenerate**: Click refresh on last assistant message → verify old message removed, new response streams in
4. **Follow-ups**: After response, verify 2-3 suggestion chips appear → click one → verify it sends as new message
5. **Export**: Click download → choose Markdown → verify file downloads with correct content. Repeat for JSON.

### Integration testing

- Full flow: new conversation → multi-turn → rename → search for it → regenerate a response → export
- Edge cases: regenerate on first message, search with no results, export empty conversation

### Build verification

- `cd web && npm run build` passes
- `cd ai-sidecar && python -m pytest tests/ -v` passes
- Docker rebuild: `docker-compose up -d --build web ai-sidecar`
