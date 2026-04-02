# Second Brain — Project Guide

## Architecture

Modular monolith (Next.js) + Python AI sidecar. All services run via Docker Compose.

```
web/                    Next.js 15 (App Router, TypeScript, Tailwind CSS)
ai-sidecar/             Python FastAPI (embeddings, RAG, summarization)
docker-compose.yml      PostgreSQL + pgvector, Redis, MinIO, web, ai-sidecar, ai-worker
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Tiptap, TanStack Query, Zustand |
| API | Next.js API Routes (REST, `/api/v1/`) |
| Database | PostgreSQL + pgvector (Prisma ORM) |
| Cache/Queue | Redis (ioredis) |
| File Storage | MinIO (S3-compatible) |
| AI (cloud) | Claude API via Anthropic SDK |
| AI (local) | Ollama (llama3, nomic-embed-text) |
| AI Sidecar | Python, FastAPI, asyncpg, tiktoken |
| Auth | NextAuth.js v5 (JWT strategy, basePath `/api/v1/auth`) |
| Testing | Vitest (unit), Playwright (E2E) |

## Key Conventions

### File Organization
- API routes: `web/src/app/api/v1/{resource}/route.ts`
- Pages: `web/src/app/(app)/{page}/page.tsx`
- Hooks: `web/src/hooks/use-{resource}.ts`
- Components: `web/src/components/{domain}/{component}.tsx`
- AI sidecar: `ai-sidecar/src/routes/{route}.py`, `ai-sidecar/src/services/{service}.py`

### Styling
- Dark-first theme via CSS custom properties in `globals.css`
- Light mode activated by adding `.light` class to `<html>`
- Color tokens: `var(--background)`, `var(--surface)`, `var(--accent)`, `var(--text-primary)`, etc.
- Utility classes: `btn-accent`, `btn-surface`, `input-base`, `card-hover`, `fade-in`, `stagger-in`, `tag-amber`
- Amber/orange accent (`#d97706`) throughout

### API Patterns
- Auth guard: `requireAuth()` from `@/lib/auth-guard` (throws on no session)
- Response helpers: `success()`, `badRequest()`, `notFound()`, `unauthorized()` from `@/lib/api-response`
- Validation: Zod schemas per endpoint
- Soft deletes: `deletedAt` timestamp, filtered with `deletedAt: null`
- Polymorphic tagging: `Taggable` table with `entityType` + `entityId` (no FK — manual joins)

### Frontend Patterns
- Hooks wrap all API calls (TanStack Query mutations + queries)
- Toast notifications via `toast()` from `@/stores/toast-store`
- All mutations have `onError` toast callbacks
- Auto-save: 500ms debounce in note editor
- Lucide React icons throughout (16px in nav, 14px in buttons)
- Date/time formatting: use `web/src/lib/date-utils.ts` for all display — renders in user's local timezone

### Sidebar Navigation (order, top to bottom)
Notes, Journal, Search, Graph, Import, Trash, **AI Chat** (with status dot), **Digest** (Lightbulb icon), Today — then user section with theme toggle and **Log Out** button (LogOut icon)

### Logo Placement
- Sidebar: `<h-14>` Agadez cross logo (`MyLogo.png`)
- Login / Register pages: `<h-16>`
- Favicon: `public/favicon.ico`
- PWA manifest: `public/manifest.json`
- Mobile top bar: logo shown in header

### AI Sidecar
- Sensitivity routing: `is_sensitive` flag routes to local (Ollama) or cloud (Claude API)
- Embeddings: chunked (500 tokens, 50 overlap) via tiktoken, stored in `embedding_chunks` with `vector(768)`
- Job queue: Redis `ai:jobs` key, 5-minute debounce per entity
- RAG: pgvector cosine similarity search, source citations

#### Sidecar endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/embed` | Generate and store embeddings for a content chunk |
| POST | `/search` | Semantic search (RAG retrieval) |
| POST | `/summarize` | Summarize note or journal entry |
| POST | `/chat` | Streaming RAG chat response |
| POST | `/tag-suggestions` | Generate auto-tag suggestions |
| POST | `/related` | Semantic similarity search for related content |
| POST | `/digest` | Generate daily digest (4 heuristics) |
| POST | `/transform` | AI text transformation (improve/simplify/expand/summarize) |

#### Auto-tag pipeline
1. Note/journal entry saved → API enqueues `auto-tag` job in Redis
2. `ai-worker` picks up job, calls sidecar `/tag-suggestions`
3. Sidecar embeds content, matches against existing tags and suggests new ones
4. Results written to DB as `TagSuggestion` with status `pending_review`
5. Frontend amber banner polls `/api/v1/ai/suggestions/[id]` every 10s and renders chips when found
6. User accepts → `PUT /api/v1/ai/suggestions/[id]` applies tag; dismisses → `DELETE`

## Dev Commands

```bash
# Start all services
docker-compose up -d

# Start only infrastructure
docker-compose up -d postgres redis minio

# Run Next.js locally (outside Docker)
cd web && npm run dev

# Run Prisma migrations
cd web && npx prisma migrate dev

# Regenerate Prisma client
cd web && npx prisma generate

# Run unit tests
cd web && npm run test:run

# Run E2E tests (requires app running at localhost:3001)
cd web && npx playwright test

# View AI sidecar logs
docker-compose logs -f ai-sidecar

# Rebuild after code changes
docker-compose up -d --build web
```

## Ports

| Service | Port |
|---------|------|
| Web (Next.js) | 3001 |
| AI Sidecar | 8000 |
| PostgreSQL | 5432 |
| Redis | 6380 |
| MinIO | 9000 (API), 9001 (console) |

## Database Notes

- pgvector `embedding` column and `search_vector` tsvector columns are managed via raw SQL (not in Prisma schema)
- After `prisma db push`, re-add them manually:
  ```sql
  ALTER TABLE notes ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_plain, ''))) STORED;
  ALTER TABLE embedding_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);
  ```
- `Taggable` has no FK to Note/JournalEntry (polymorphic pattern). Tag lookups use separate `db.taggable.findMany()` queries.
- `Note` model has `lastViewedAt DateTime?` — updated when a note is opened; used by the Digest's Forgotten Relevance heuristic.
- `TagSuggestion` model tracks auto-tag pipeline output with a `status` field: `pending_review`, `accepted`, `dismissed`.

## API Routes Reference

### AI routes (under `/api/v1/ai/`)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/v1/ai/related/[type]/[id]` | Related notes: semantic (pgvector cosine) + title-match |
| GET | `/api/v1/ai/digest` | Daily digest (4 heuristics) |
| POST | `/api/v1/ai/transform` | Text transformation (improve/simplify/expand/summarize) |
| GET | `/api/v1/ai/status` | AI sidecar health check (used by sidebar status dot) |
| GET | `/api/v1/ai/suggestions/[id]` | Fetch a specific tag suggestion |
| PUT | `/api/v1/ai/suggestions/[id]` | Accept a tag suggestion |
| DELETE | `/api/v1/ai/suggestions/[id]` | Dismiss a tag suggestion |

### Other key routes
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/v1/notes` | Note list and creation |
| GET/PUT/DELETE | `/api/v1/notes/[id]` | Note CRUD |
| GET/POST | `/api/v1/journal` | Journal entry list and creation |
| GET/PUT/DELETE | `/api/v1/journal/[id]` | Journal entry CRUD |
| POST | `/api/v1/ai/summarize/[type]` | Summarize note or journal entry |
| GET/POST | `/api/v1/ai/conversations` | Chat conversation management |
| GET/DELETE | `/api/v1/ai/conversations/[id]` | Specific conversation |
| GET/POST | `/api/v1/templates` | Note templates |

## Environment Variables

See `.env.example` for all variables. Key ones:
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — for cloud AI features
- `AI_ROUTING_MODE` — `hybrid` (default), `local`, or `cloud`
- `NEXTAUTH_SECRET` — session encryption key
