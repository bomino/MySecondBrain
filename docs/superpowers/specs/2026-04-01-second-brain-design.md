# Second Brain — Design Spec

## Overview

A personal Life OS web application that serves as an all-in-one system for notes, tasks, journal, file management, habit/finance/health tracking, and project planning. The core differentiator is an AI layer that provides semantic search, auto-tagging, summarization, knowledge connections, and conversational access to your own data.

**Architecture:** Next.js modular monolith + Python AI sidecar.
**Target:** Single user, web-first (responsive for mobile browsers), architected with a clean API layer so future native clients can consume the same backend.

---

## Tier Phasing

The system ships in explicit tiers. Each tier is a usable product on its own.

### Tier 1 — Core Brain (MVP)
- Notes & Knowledge Base (with bidirectional linking)
- Journal
- AI Layer (semantic search, auto-tagging, summarization, chat with knowledge base)
- Markdown import (seed from existing notes)
- Auth, search, tagging

### Tier 2 — Productivity
- Tasks & Projects (kanban, list, calendar views)
- Media & Files (upload, transcription, OCR)
- Daily digest

### Tier 3 — Tracking
- Habit tracker
- Finance tracker
- Health metrics
- Custom tracker builder
- Tracker dashboards

Each tier builds on the previous. No tier is started until the prior tier is complete and usable.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client Layer                   │
│          Next.js (React + Server Components)     │
│          Responsive web UI (mobile-friendly)     │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / Server Actions
┌──────────────────────▼──────────────────────────┐
│                  API Layer                        │
│          Next.js API Routes (REST /api/v1/)      │
│          Auth, validation, routing               │
│          Public API for future clients           │
└───────┬──────────────────────────────┬──────────┘
        │ SQL (Prisma)                 │ HTTP (internal)
┌───────▼──────────┐          ┌───────▼──────────┐
│   Data Layer     │          │   AI Sidecar     │
│                  │          │  (Python/FastAPI) │
│ PostgreSQL       │◄────────►│                  │
│  + pgvector      │  SQL     │ Embeddings       │
│                  │          │ Summarization     │
│ S3-compatible    │          │ Document parsing  │
│  (MinIO local /  │          │ Chat w/ knowledge │
│   AWS S3 cloud)  │          │ Sensitivity router│
│                  │          │ Ollama (local)    │
│ Redis (cache +   │          │ Claude API (cloud)│
│  job queue)      │          │                  │
└──────────────────┘          └──────────────────┘
```

### Key Decisions

- **Next.js API routes serve as the public API.** The UI consumes the same endpoints a future mobile app would.
- **AI sidecar is internal only.** The Next.js API layer is the single gateway. The sidecar is never exposed directly.
- **PostgreSQL + pgvector** handles both relational data and vector search in one DB. No separate vector DB needed at single-user scale.
- **Redis** for caching and as a lightweight job queue for async AI tasks.
- **S3-compatible storage** via MinIO locally, swappable to AWS S3 for production.
- **User as top-level container.** No Workspace abstraction — single-user system. If multi-user becomes real, that's a redesign, not a flag flip.

---

## Module Breakdown

### 1. Notes & Knowledge Base (Tier 1)

- Rich text editor (Tiptap/ProseMirror) with markdown support
- Bidirectional linking between notes (`[[note-name]]` syntax)
- Tags, folders, and saved searches for organization
- Web clipper (bookmarks, article saves)
- Code snippet support with syntax highlighting
- Graph view of note connections

**The editor is the primary workstream of Tier 1.** Tiptap with `[[` autocomplete, mixed media embeds, code blocks, and bidirectional link resolution is weeks of dedicated work. It touches notes AND journal — it must be solid before either module is considered done.

### 2. Journal (Tier 1)

- Daily entries with date-based navigation
- Templated prompts (configurable per day-of-week)
- Mood/energy tagging
- Private by default — marked as sensitive for local-only AI processing
- Shares the same Tiptap editor as Notes

### 3. AI Layer (Tier 1)

- Semantic search across all content
- Auto-tagging and categorization on ingest
- Document/article summarization
- Chat with your brain (RAG — see AI Sidecar section)
- Sensitivity router with per-query user choice
- Markdown import processor

### 4. Tasks & Projects (Tier 2)

- Tasks with priorities, due dates, labels, subtasks
- Projects as task containers with status tracking
- Kanban, list, and calendar views
- Recurring tasks
- Simple dependency tracking (blocks/blocked-by)

### 5. Media & Files (Tier 2)

- Upload and store PDFs, images, voice memos, videos
- PDF viewer with annotation
- Voice memo transcription (via AI sidecar + Whisper)
- Image OCR for searchability
- File attachments linkable from any other module

### 6. Daily Digest (Tier 2)

Surfaced via an in-app digest page and optional notification.

Heuristics:
- **Forgotten relevance:** Notes not viewed in 30+ days that are semantically similar to content created/edited in the last 7 days.
- **On this day:** Journal entries from the same date in prior years.
- **Deadline context:** Tasks due within 7 days, with semantically related notes and journal entries surfaced as context.
- **Orphan detection:** Notes with no tags and no inbound/outbound links, older than 14 days. Prompt user to connect or archive.
- **Cluster alerts:** When 3+ recent notes cluster semantically but aren't explicitly linked, suggest a connection.

The digest is generated once daily (configurable time), cached, and refreshed on demand.

### 7. Trackers (Tier 3)

- Habit tracking (streaks, completions)
- Finance tracking (transactions, categories, budgets)
- Health metrics (weight, exercise, sleep — manual entry)
- Custom tracker builder (define your own metrics via JSON config)
- Dashboard with charts/trends (Recharts)

### Cross-Cutting Concerns

- **Auth:** NextAuth.js v5 — email/password (credentials provider) + OAuth (Google). Session strategy: JWT (stateless, no session table needed).
- **Search:** full-text (PostgreSQL tsvector) + semantic (pgvector), combined ranking
- **Notifications:** in-app reminders for tasks, habits, journal prompts
- **Import/Export:** markdown import in Tier 1 (critical for adoption). JSON and CSV export. No vendor lock-in.

---

## Data Model

### Core Entities

```sql
-- Top-level
User {
  id              UUID PK
  email           TEXT UNIQUE
  password_hash   TEXT
  avatar_url      TEXT
  settings        JSONB
  created_at      TIMESTAMPTZ
}

-- Tier 1
Note {
  id              UUID PK
  user_id         UUID FK -> User
  title           TEXT
  content         JSONB          -- Tiptap JSON document
  content_plain   TEXT           -- stripped from content by backend on save
  parent_id       UUID FK -> Note (nullable, for hierarchy/folders — a note with children can also have content)
  is_sensitive    BOOLEAN DEFAULT false
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
  deleted_at      TIMESTAMPTZ    -- soft delete
}

NoteLink {
  source_id       UUID FK -> Note
  target_id       UUID FK -> Note
  context         TEXT           -- surrounding text at link site
  PRIMARY KEY (source_id, target_id)
}

JournalEntry {
  id              UUID PK
  user_id         UUID FK -> User
  date            DATE UNIQUE (per user)
  content         JSONB
  content_plain   TEXT
  mood            SMALLINT (1-5, nullable)
  energy          SMALLINT (1-5, nullable)
  is_sensitive    BOOLEAN DEFAULT true   -- sensitive by default
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
  deleted_at      TIMESTAMPTZ
}

-- Tier 2
Project {
  id              UUID PK
  user_id         UUID FK -> User
  name            TEXT
  description     TEXT
  status          TEXT           -- active, paused, completed, archived
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
  deleted_at      TIMESTAMPTZ
}

Task {
  id              UUID PK
  user_id         UUID FK -> User
  project_id      UUID FK -> Project (nullable)
  title           TEXT
  description     TEXT
  status          TEXT           -- todo, in_progress, done
  priority        SMALLINT       -- 1 (highest) to 4 (lowest)
  due_date        DATE
  recurrence      JSONB          -- { freq: "daily"|"weekly"|..., interval: N }
  is_sensitive    BOOLEAN DEFAULT false
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
  deleted_at      TIMESTAMPTZ
}

TaskDependency {
  blocker_id      UUID FK -> Task
  blocked_id      UUID FK -> Task
  PRIMARY KEY (blocker_id, blocked_id)
}

MediaFile {
  id              UUID PK
  user_id         UUID FK -> User
  filename        TEXT
  mime_type       TEXT
  size_bytes      BIGINT
  storage_path    TEXT
  transcript      TEXT           -- from Whisper/OCR
  is_sensitive    BOOLEAN DEFAULT false
  created_at      TIMESTAMPTZ
  deleted_at      TIMESTAMPTZ
}

-- Tier 3
Tracker {
  id              UUID PK
  user_id         UUID FK -> User
  name            TEXT
  type            TEXT           -- habit, finance, health, custom
  config          JSONB          -- field definitions for custom trackers
  created_at      TIMESTAMPTZ
  deleted_at      TIMESTAMPTZ
}

TrackerEntry {
  id              UUID PK
  tracker_id      UUID FK -> Tracker
  date            DATE
  value           JSONB          -- flexible: { completed: true } or { amount: 42.50, category: "food" }
  created_at      TIMESTAMPTZ
}

-- Shared
Tag {
  id              UUID PK
  user_id         UUID FK -> User
  name            TEXT
  color           TEXT
  UNIQUE (user_id, name)
}

Taggable {
  tag_id          UUID FK -> Tag
  entity_type     TEXT           -- note, task, journal_entry, media_file
  entity_id       UUID
  PRIMARY KEY (tag_id, entity_type, entity_id)
}

EmbeddingChunk {
  id              UUID PK
  entity_type     TEXT           -- note, journal_entry, task, media_file
  entity_id       UUID
  chunk_index     SMALLINT
  chunk_text      TEXT
  embedding       VECTOR(768)    -- dimension matches nomic-embed-text; cloud embeddings normalized to same dimension
  created_at      TIMESTAMPTZ
}

AIJobLog {
  id              UUID PK
  user_id         UUID FK -> User
  entity_type     TEXT
  entity_id       UUID
  job_type        TEXT           -- embed, summarize, auto_tag, transcribe, ocr, chat, digest
  status          TEXT           -- queued, processing, completed, failed
  routed_to       TEXT           -- local, cloud
  result          JSONB
  error           TEXT
  created_at      TIMESTAMPTZ
  completed_at    TIMESTAMPTZ
}
```

### Key Design Decisions

- **`is_sensitive`** on every content entity. Checked at the API layer before any AI call — not just the sidecar.
- **All embeddings live in `EmbeddingChunk`.** No embedding columns on entities. Short content (<1000 tokens) gets a single chunk; long content gets overlapping chunks (~500 tokens, 50 token overlap). Dimension is 768 (nomic-embed-text). Cloud embeddings are projected/normalized to the same dimension so all vectors are comparable.
- **`content_plain`** on notes and journal — stripped from Tiptap JSON by the backend on save (not the frontend, not the sidecar). Used for full-text search indexing and passed to the sidecar for AI processing.
- **Polymorphic tagging** via `Taggable` (entity_type + entity_id). Tags work across all entity types.
- **`AIJobLog`** tracks every AI operation for auditability and debugging.
- **Journal entries are sensitive by default.** User can override per-entry.
- **Note hierarchy:** `parent_id` enables folder-like nesting. A note with children can also have its own content (unlike traditional folders). No separate Folder entity.
- **Soft deletes everywhere** via `deleted_at`. Excluded from queries by default, recoverable.

---

## AI Sidecar Design

### Service

Python FastAPI service. Single responsibility: AI operations. Called only by the Next.js API layer, never exposed to users.

### Internal API

```
POST /embed          — Generate embedding for text/document
POST /summarize      — Summarize content
POST /auto-tag       — Suggest tags for content
POST /transcribe     — Voice memo → text (Whisper)
POST /ocr            — Image → text
POST /chat           — Chat with knowledge base (RAG)
POST /digest         — Generate daily digest
GET  /health         — Health check
```

### Sensitivity Router

Every request includes `is_sensitive: boolean`. Additionally, the API layer enforces sensitivity at the gateway — sensitive content is never sent to cloud endpoints regardless of sidecar behavior.

```python
if is_sensitive:
    model = OllamaClient(model="llama3")     # local, nothing leaves machine
else:
    model = AnthropicClient(model="claude")   # cloud API
```

Configurable via environment variables. User can force all-local or all-cloud globally.

### Per-Query Sensitivity Choice (RAG)

When a chat query retrieves both sensitive and non-sensitive chunks, the user is given an explicit choice:

> "This question found both sensitive and non-sensitive results. Choose:
> (A) Process locally — uses all results, slower, less capable model
> (B) Exclude sensitive results — uses cloud model, faster, better quality, but some context omitted"

The UI presents this as a simple toggle before the answer is generated. Default: Option A (privacy-first).

### RAG Pipeline

```
User question
    → Embed question
    → Retrieve top-k relevant chunks from pgvector
    → Check sensitivity of retrieved chunks
    → If mixed: prompt user for routing choice
    → Build context window with source attribution
    → Generate answer with citations (links back to source entities)
    → Return answer + source links
```

### Embedding Strategy

Embeddings are not regenerated on every edit. Instead:

- **Debounced updates:** Re-embed only after 5 minutes of no edits to an entity, or on explicit save.
- **Chunked embeddings for long content:** Notes and journal entries over 1000 tokens are split into overlapping chunks (~500 tokens, 50 token overlap). Each chunk gets its own embedding row in a separate `EmbeddingChunk` table, linked to the parent entity. This improves RAG retrieval quality — a specific paragraph can be found rather than relying on a single vector representing an entire long note.
- **Staleness indicator:** Entities with pending embedding updates are flagged in search results: "AI index updating — results may be incomplete."

See `EmbeddingChunk` in Data Model section for schema.

### Processing Pipeline (on content ingest)

```
New/updated content arrives
    → Next.js enqueues job in Redis (debounced — 5 min cooldown per entity)
    → Sidecar picks up job
    → Extract plain text (PDF parse, OCR, transcription as needed)
    → Generate embedding(s) → store in pgvector (single or chunked)
    → Auto-tag → suggest tags (user confirms or auto-applies based on settings)
    → Summarize (if long-form content, >500 words)
    → Log job result in AIJobLog
```

All processing is async. The user never waits for AI to finish.

### Local Model Requirements

For sensitive data processing via Ollama:
- **Embedding:** `nomic-embed-text` (~500MB)
- **Chat/summarization:** `llama3` 8B (~4.7GB)
- **Whisper:** `whisper.cpp` small model (~500MB)

Total: ~6GB VRAM/RAM for local inference.

Graceful degradation: if Ollama isn't running, sensitive items queue and the user gets an in-app notification. Non-sensitive processing continues via cloud API.

---

## API Design

All routes versioned under `/api/v1/`. Every route is consumable by future native clients.

### Conventions

- Pagination: `?page=&limit=&sort=&order=` on all list endpoints
- Filtering: query params (`?tag=work&status=active`)
- Soft deletes: `deleted_at` timestamp, excluded by default
- Error format: `{ error: string, code: string, details?: object }`
- Auth: HTTP-only cookies (web) + Bearer tokens (future API clients)

### Routes

```
/api/v1/auth
  POST   /register
  POST   /login
  POST   /logout
  POST   /refresh
  GET    /me

/api/v1/notes
  GET    /                    — List (paginated, filterable by tag/folder/search)
  POST   /                    — Create
  GET    /:id                 — Get
  PUT    /:id                 — Update
  DELETE /:id                 — Soft delete
  GET    /:id/links           — Get bidirectional links
  GET    /:id/backlinks       — Get notes linking TO this note
  GET    /graph               — Get link graph data

/api/v1/tasks
  GET    /                    — List (filterable by project/status/priority/due)
  POST   /                    — Create
  GET    /:id                 — Get
  PUT    /:id                 — Update
  DELETE /:id                 — Soft delete
  PUT    /:id/status          — Quick status change
  GET    /views/kanban        — Kanban-grouped response
  GET    /views/calendar      — Calendar-grouped response

/api/v1/projects
  GET    /                    — List
  POST   /                    — Create
  GET    /:id                 — Get with task summary
  PUT    /:id                 — Update
  DELETE /:id                 — Soft delete

/api/v1/journal
  GET    /                    — List entries (paginated, date range)
  POST   /                    — Create (one per date enforced)
  GET    /:date               — Get by date (YYYY-MM-DD)
  PUT    /:date               — Update
  GET    /streaks             — Journal consistency stats

/api/v1/media
  POST   /upload              — Upload file (multipart)
  GET    /:id                 — Get metadata
  GET    /:id/download        — Stream file
  GET    /:id/transcript      — Get transcription/OCR text
  DELETE /:id                 — Soft delete

/api/v1/trackers
  GET    /                    — List trackers
  POST   /                    — Create tracker
  GET    /:id                 — Get tracker with recent entries
  PUT    /:id                 — Update tracker config
  DELETE /:id                 — Soft delete
  POST   /:id/entries         — Log entry
  GET    /:id/entries         — Get entries (date range)
  GET    /:id/stats           — Aggregated stats/trends

/api/v1/search
  GET    /                    — Combined full-text + semantic search
  GET    /semantic            — Semantic only

/api/v1/ai
  POST   /chat                — Chat with knowledge base
  POST   /chat/choose-routing — Submit sensitivity routing choice
  GET    /digest              — Get daily digest
  POST   /summarize/:type/:id — Summarize specific entity
  GET    /suggestions         — Get pending auto-tag suggestions
  PUT    /suggestions/:id     — Accept/reject suggestion

/api/v1/tags
  GET    /                    — List all tags
  POST   /                    — Create
  PUT    /:id                 — Update
  DELETE /:id                 — Delete (untags all entities)

/api/v1/import
  POST   /markdown            — Import markdown files (single or zip)
  GET    /status/:jobId       — Check import job status

/api/v1/clip
  POST   /                    — Web clipper: save URL with extracted content as a note
```

---

## Frontend Architecture

### Layout

Sidebar navigation (collapsible) with sections:
- **Search** (global — `Cmd+K` command palette)
- **Notes** (tree view + recent)
- **Journal** (calendar picker)
- **AI Chat** (slide-out panel, accessible from anywhere)
- **Tasks** (Tier 2, with project grouping)
- **Files** (Tier 2, grid/list toggle)
- **Trackers** (Tier 3, dashboard home)

### UI Stack

- **shadcn/ui** — Tailwind-based component library, fully customizable
- **Tiptap** — Rich text editor for notes and journal (dedicated workstream)
- **TanStack Query** — Server state management, caching, optimistic updates
- **Zustand** — Minimal client state (sidebar, UI preferences)
- **Recharts** — Tracker dashboards (Tier 3)
- **React Flow** — Note graph visualization

### Key UX

- **Quick capture:** `Cmd+K` opens command palette. Type to search, prefix with `+` to quick-create (`+note`, `+task`, `+journal`).
- **Everything linkable:** Any entity can be linked from a note via `[[` syntax. Notes, tasks, journal entries — all searchable in the link picker.
- **AI Chat as overlay:** Slide-out panel on the right. Context-aware — if viewing a note, chat defaults to that note's context. Can expand to full-page.
- **Dark/light mode:** System preference by default, manual toggle.
- **Responsive:** Sidebar collapses to bottom nav on mobile viewports. Editor goes full-width.

---

## Deployment & Infrastructure

### Development (local)

```yaml
docker-compose up
├── next-app        (port 3000)
├── ai-sidecar      (port 8000)
├── postgres         (port 5432, pgvector extension)
├── redis            (port 6379)
└── minio            (port 9000, S3-compatible)
```

Single `docker-compose up` for the full stack.

### Production (when ready)

| Service | Option |
|---------|--------|
| Next.js app | Vercel or any Node.js host |
| AI Sidecar | Fly.io or Railway |
| PostgreSQL | Supabase, Neon, or managed RDS (pgvector supported) |
| Redis | Upstash (serverless) or managed Redis |
| File storage | AWS S3 or Cloudflare R2 |
| Ollama | Local machine or dedicated GPU VPS |

### CI/CD

- GitHub Actions: lint, type-check, test on PR
- Preview deploys for frontend (Vercel)
- Database migrations via Prisma Migrate

---

## Security & Privacy

- **Auth:** NextAuth.js v5 handles session management. Passwords hashed with bcrypt. JWT strategy with short expiry. HTTP-only secure cookies.
- **Sensitivity enforcement:** `is_sensitive` checked at the API layer before any AI call. The API refuses to send sensitive content to cloud endpoints regardless of sidecar behavior. Double enforcement (API + sidecar).
- **Encryption at rest:** Sensitive fields encrypted in the database (AES-256). Decrypted only in-memory during processing.
- **File storage:** Sensitive files stored with server-side encryption. Pre-signed URLs with short TTLs for access.
- **Rate limiting:** Per-user rate limits on API endpoints, stricter on AI endpoints.
- **CORS:** Locked to known origins.
- **Audit log:** All AI operations logged in `AIJobLog` with routing decisions.

---

## Known Gaps (Deferred)

| Gap | Status | Target |
|-----|--------|--------|
| Offline/PWA support | Acknowledged, not v1 | v2 — service worker + IndexedDB for offline capture, sync on reconnect |
| Native mobile apps | Architected for (clean API) | Future — API is ready, build native clients when needed |
| Multi-user | Not supported, no Workspace abstraction | Future — would require redesign of auth, encryption, and Ollama sharing |
| End-to-end encryption | Not in scope | Future — would require client-side encryption before storage |

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui |
| Editor | Tiptap (ProseMirror) |
| State | TanStack Query + Zustand |
| API | Next.js API Routes (REST) |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| Cache/Queue | Redis |
| File Storage | MinIO (local) / S3 (production) |
| AI Sidecar | Python, FastAPI |
| AI (cloud) | Claude API (Anthropic) |
| AI (local) | Ollama (llama3, nomic-embed-text) |
| Transcription | Whisper (whisper.cpp) |
| Auth | NextAuth.js (v5) |
| Deployment | Docker Compose (local), Vercel + Fly.io (production) |
| CI/CD | GitHub Actions |
| Charts | Recharts |
| Graph | React Flow |
