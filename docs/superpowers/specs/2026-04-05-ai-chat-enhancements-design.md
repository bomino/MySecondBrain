# AI Chat Enhancements — Design Spec

**Date**: 2026-04-05
**Scope**: Batch 1 (enhancements 1-5), with Batch 2 (6-10) noted for future work

## Context

The AI Chat feature is a RAG-powered conversational interface over the user's knowledge base (notes + journal entries). It currently handles single-turn Q&A: each message is independent, responses arrive as a single JSON blob, and output is rendered as plain text. These enhancements transform it into a proper multi-turn AI assistant with streaming, rich rendering, and quality-of-life improvements.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Conversation context depth | Last 10 messages | Good balance of context and token cost |
| Streaming transport | SSE end-to-end | Simple, well-supported, standard for LLM chat |
| Markdown renderer | react-markdown + rehype-highlight | Lightweight, reuses existing lowlight dep |
| No-context behavior | LLM answers from general knowledge with disclaimer | Still useful for general questions |

---

## Enhancement 1: Multi-Turn Conversation Context

### Problem
Each chat query is independent. The LLM doesn't see prior messages, so follow-ups ("expand on that", "what about the second point?") don't work.

### Design

**Data flow**: Frontend sends `messages` array (last 10 from current conversation) alongside the new query. The sidecar builds a multi-turn prompt combining RAG context with conversation history.

**Sidecar prompt structure**:
```
System: You are a personal knowledge assistant. [existing system prompt]

Context from knowledge base:
[RAG chunks]

---

[Previous message 1: user]
[Previous message 2: assistant]
...
[New user query]
```

**Provider-specific formatting**:
- Anthropic: Native `messages` array with `system` parameter
- Ollama: Messages array in chat completion format
- OpenAI-compatible: Standard OpenAI messages format

### Files to modify

| File | Change |
|------|--------|
| `web/src/hooks/use-ai-chat.ts` | Include last 10 messages in POST body |
| `web/src/app/api/v1/ai/chat/route.ts` | Pass `messages` array to sidecar |
| `ai-sidecar/src/routes/chat.py` | Accept `messages` field in request body |
| `ai-sidecar/src/services/rag.py` | Build multi-turn prompt with history |
| `ai-sidecar/src/services/llm.py` | Format messages per provider (Anthropic native messages, Ollama/OpenAI chat format) |

### Validation
- Zod schema update: `messages` as optional array of `{role, content}` objects
- Pydantic model update: `messages` field with `List[dict]` type

---

## Enhancement 2: Streaming Responses (SSE)

### Problem
Users wait 5-15 seconds staring at animated dots before seeing any response.

### Design

**End-to-end SSE pipeline**:
```
Sidecar (FastAPI StreamingResponse)
  → Next.js API route (relay stream)
    → Browser (ReadableStream reader)
      → React state (incremental message update)
```

**SSE event format**:
```
event: token
data: {"text": "Hello"}

event: token
data: {"text": " world"}

event: sources
data: {"sources": [...], "routed_to": "cloud", "has_sensitive_context": false}

event: done
data: {}

event: error
data: {"message": "Ollama connection refused"}
```

**Sidecar changes**:
- `llm.py`: Add `generate_text_stream()` for each provider:
  - Anthropic: `client.messages.stream()` → yield content deltas
  - Ollama: `stream=True` on chat completion → yield chunks
  - OpenAI-compatible: `stream=True` → yield `choices[0].delta.content`
- `rag.py`: Add `chat_stream()` that retrieves context, then yields tokens from `generate_text_stream()`
- `routes/chat.py`: Add `/chat/stream` endpoint returning `StreamingResponse(media_type="text/event-stream")`

**Next.js API route changes**:
- `chat/route.ts`: Fetch sidecar `/chat/stream`, relay the response body as a `ReadableStream` with `text/event-stream` content type and appropriate headers (`Cache-Control: no-cache`, `Connection: keep-alive`)

**Frontend changes**:
- `use-ai-chat.ts`: Replace `fetch` + `res.json()` with streaming reader:
  1. Create placeholder assistant message in state
  2. Read SSE events from `response.body.getReader()`
  3. On `token` events: append text to assistant message content
  4. On `sources` event: attach sources to message
  5. On `done`: save complete message to DB via `/conversations/[id]/messages`
  6. On `error`: show toast with error message
- `chat-panel.tsx`: Disable input during streaming, show partial message in real-time

**Backward compatibility**: Keep the existing non-streaming `/chat` endpoint for now. The frontend switches to the streaming endpoint.

### Files to modify

| File | Change |
|------|--------|
| `ai-sidecar/src/services/llm.py` | Add `generate_text_stream()` variants per provider |
| `ai-sidecar/src/services/rag.py` | Add `chat_stream()` generator |
| `ai-sidecar/src/routes/chat.py` | Add `/chat/stream` SSE endpoint |
| `web/src/app/api/v1/ai/chat/route.ts` | Relay SSE stream from sidecar |
| `web/src/hooks/use-ai-chat.ts` | ReadableStream-based message building |
| `web/src/components/ai/chat-panel.tsx` | Render partial messages, disable input during stream |

---

## Enhancement 3: Markdown + Code Rendering

### Problem
LLM responses contain markdown (headings, lists, code blocks) but are displayed as plain text.

### Design

**New dependencies**: `react-markdown`, `rehype-highlight`

**Rendering rules**:
- Assistant messages: render through `<ReactMarkdown>` with `rehypePlugins={[rehypeHighlight]}`
- User messages: remain plain text (no markdown parsing)
- Code blocks: syntax-highlighted via lowlight (already installed), styled to match the dark-first theme

**Styling**: Add scoped CSS for markdown content within chat messages:
- Code blocks: `var(--surface)` background, rounded corners, horizontal scroll
- Inline code: subtle background tint
- Links: accent color
- Lists: proper indentation
- Tables: bordered, readable

### Files to modify

| File | Change |
|------|--------|
| `web/src/components/ai/chat-message.tsx` | Wrap assistant content in `<ReactMarkdown>` |
| `web/src/app/globals.css` (or scoped module) | Chat markdown styles |
| `package.json` | Add react-markdown, rehype-highlight |

---

## Enhancement 4: Similarity Threshold Filtering

### Problem
All top-10 RAG chunks are injected regardless of relevance score. Low-similarity chunks can mislead the LLM.

### Design

**Threshold**: 0.3 minimum cosine similarity (configurable constant in `rag.py`)

**Behavior**:
- Filter retrieved chunks: only keep those with `similarity >= MIN_SIMILARITY_THRESHOLD`
- Track whether any chunks passed: `has_context` boolean
- When `has_context` is False:
  - System prompt changes to: "The user's knowledge base did not contain relevant information for this query. You may answer from your general knowledge, but preface your answer with a brief note that you didn't find relevant notes."
  - Sources array is empty
- When `has_context` is True: existing behavior (inject filtered chunks)

### Files to modify

| File | Change |
|------|--------|
| `ai-sidecar/src/services/rag.py` | Add `MIN_SIMILARITY_THRESHOLD = 0.3`, filter chunks, return `has_context`, adjust system prompt |

---

## Enhancement 5: Copy Message Button

### Problem
Users frequently want to copy AI answers to paste elsewhere. No way to do this except manual text selection.

### Design

**UX**:
- Clipboard icon (Lucide `Copy`, 14px) appears on hover over assistant messages, positioned in the top-right corner of the message
- On click: copy raw markdown content to clipboard via `navigator.clipboard.writeText()`
- Icon transitions to `Check` for 2 seconds, then reverts to `Copy`
- No toast needed — the icon change is sufficient feedback

**User messages**: no copy button (users wrote those themselves)

### Files to modify

| File | Change |
|------|--------|
| `web/src/components/ai/chat-message.tsx` | Add copy button with hover reveal, clipboard logic, icon toggle state |

---

## Batch 2 (Future — enhancements 6-10)

Deferred to a separate design cycle after Batch 1 ships:

| # | Enhancement | Notes |
|---|-------------|-------|
| 6 | Conversation renaming | PUT endpoint + inline edit UI in sidebar |
| 7 | Conversation search | Full-text search across titles and message content |
| 8 | Regenerate response | Re-send last query, replace last assistant message |
| 9 | Suggested follow-ups | LLM generates 2-3 follow-up questions after each response |
| 10 | Export conversation | Download as markdown file |

---

## Verification Plan

### Per-enhancement testing

1. **Multi-turn**: Send 3+ messages in a conversation, verify follow-up references work ("what about that?" should refer to prior answer)
2. **Streaming**: Verify tokens appear incrementally (not all at once), sources attach after stream completes, error events show toast
3. **Markdown**: Send a query that produces headings, code blocks, lists — verify rendering with syntax highlighting
4. **Similarity threshold**: Ask an unrelated question (e.g., "what is the speed of light?") — verify disclaimer appears and no sources shown
5. **Copy button**: Hover over assistant message, click copy, paste elsewhere — verify raw markdown content

### Integration testing

- Full flow: new conversation → multi-turn with streaming → verify messages persist on page reload
- Sensitivity routing: verify streaming works for both local (Ollama) and cloud (Anthropic) providers
- Error handling: stop Ollama, send a message — verify error SSE event triggers toast

### Build verification

- `cd web && npm run build` passes
- Docker rebuild: `docker-compose up -d --build web ai-sidecar`
- `cd web && npm run test:run` passes (existing tests don't break)
