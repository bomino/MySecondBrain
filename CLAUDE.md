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

### AI Sidecar
- Sensitivity routing: `is_sensitive` flag routes to local (Ollama) or cloud (Claude API)
- Embeddings: chunked (500 tokens, 50 overlap) via tiktoken, stored in `embedding_chunks` with `vector(768)`
- Job queue: Redis `ai:jobs` key, 5-minute debounce per entity
- RAG: pgvector cosine similarity search, source citations

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

## Environment Variables

See `.env.example` for all variables. Key ones:
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — for cloud AI features
- `AI_ROUTING_MODE` — `hybrid` (default), `local`, or `cloud`
- `NEXTAUTH_SECRET` — session encryption key
