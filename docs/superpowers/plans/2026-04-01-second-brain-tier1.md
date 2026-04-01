# Second Brain — Tier 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable personal knowledge base with notes (bidirectional linking), journal, AI-powered semantic search, auto-tagging, summarization, RAG chat, and markdown import.

**Architecture:** Next.js modular monolith (API + UI) + Python FastAPI AI sidecar. PostgreSQL with pgvector for data + embeddings. Redis for job queue. MinIO for file storage. All services run via Docker Compose.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Tiptap, Prisma, PostgreSQL + pgvector, Redis, Python, FastAPI, Ollama, Claude API, Docker

**Spec:** `docs/superpowers/specs/2026-04-01-second-brain-design.md`

---

## File Structure

```
second-brain/
├── docker-compose.yml
├── .env.example
├── .env                          # local only, gitignored
├── .gitignore
│
├── web/                           # Next.js application
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── components.json            # shadcn/ui config
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (app)/
│   │   │   │   ├── layout.tsx          # authenticated shell (sidebar + main)
│   │   │   │   ├── notes/
│   │   │   │   │   ├── page.tsx        # notes list
│   │   │   │   │   └── [id]/page.tsx   # note editor
│   │   │   │   ├── journal/
│   │   │   │   │   ├── page.tsx        # journal list / calendar
│   │   │   │   │   └── [date]/page.tsx # journal entry editor
│   │   │   │   ├── search/page.tsx
│   │   │   │   └── ai/page.tsx         # full-page AI chat
│   │   │   └── api/v1/
│   │   │       ├── auth/[...nextauth]/route.ts
│   │   │       ├── notes/
│   │   │       │   ├── route.ts        # GET list, POST create
│   │   │       │   ├── [id]/
│   │   │       │   │   ├── route.ts    # GET, PUT, DELETE
│   │   │       │   │   ├── links/route.ts
│   │   │       │   │   └── backlinks/route.ts
│   │   │       │   └── graph/route.ts
│   │   │       ├── journal/
│   │   │       │   ├── route.ts        # GET list, POST create
│   │   │       │   ├── [date]/route.ts # GET, PUT
│   │   │       │   └── streaks/route.ts
│   │   │       ├── tags/route.ts
│   │   │       ├── search/route.ts
│   │   │       ├── ai/
│   │   │       │   ├── chat/route.ts
│   │   │       │   ├── suggestions/route.ts
│   │   │       │   └── summarize/[type]/[id]/route.ts
│   │   │       ├── import/
│   │   │       │   ├── markdown/route.ts
│   │   │       │   └── status/[jobId]/route.ts
│   │   │       └── clip/route.ts
│   │   ├── lib/
│   │   │   ├── db.ts               # Prisma client singleton
│   │   │   ├── auth.ts             # NextAuth config
│   │   │   ├── auth-guard.ts       # API route auth helper
│   │   │   ├── ai-client.ts        # HTTP client for sidecar
│   │   │   ├── queue.ts            # Redis job queue helpers
│   │   │   ├── search.ts           # full-text + semantic search logic
│   │   │   ├── tiptap-utils.ts     # strip plain text from Tiptap JSON
│   │   │   └── api-response.ts     # consistent error/success helpers
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui components (generated)
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── command-palette.tsx
│   │   │   │   └── theme-toggle.tsx
│   │   │   ├── editor/
│   │   │   │   ├── tiptap-editor.tsx       # main editor component
│   │   │   │   ├── extensions/
│   │   │   │   │   ├── wiki-link.ts        # [[ ]] autocomplete extension
│   │   │   │   │   └── code-block.ts       # syntax highlighted code blocks
│   │   │   │   └── link-picker.tsx         # autocomplete dropdown for [[
│   │   │   ├── notes/
│   │   │   │   ├── note-list.tsx
│   │   │   │   ├── note-tree.tsx           # hierarchical tree view
│   │   │   │   └── note-graph.tsx          # React Flow graph
│   │   │   ├── journal/
│   │   │   │   ├── journal-calendar.tsx
│   │   │   │   └── mood-picker.tsx
│   │   │   ├── tags/
│   │   │   │   ├── tag-input.tsx
│   │   │   │   └── tag-badge.tsx
│   │   │   ├── search/
│   │   │   │   └── search-results.tsx
│   │   │   └── ai/
│   │   │       ├── chat-panel.tsx          # slide-out chat
│   │   │       └── chat-message.tsx
│   │   ├── hooks/
│   │   │   ├── use-notes.ts
│   │   │   ├── use-journal.ts
│   │   │   ├── use-tags.ts
│   │   │   ├── use-search.ts
│   │   │   └── use-ai-chat.ts
│   │   └── stores/
│   │       └── ui-store.ts          # Zustand: sidebar, theme, chat panel
│   └── __tests__/
│       ├── api/
│       │   ├── notes.test.ts
│       │   ├── journal.test.ts
│       │   ├── tags.test.ts
│       │   ├── search.test.ts
│       │   └── ai.test.ts
│       └── lib/
│           ├── tiptap-utils.test.ts
│           └── auth-guard.test.ts
│
├── ai-sidecar/                    # Python FastAPI service
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── src/
│   │   ├── main.py                # FastAPI app + startup
│   │   ├── config.py              # env-based config
│   │   ├── db.py                  # async PostgreSQL connection
│   │   ├── routes/
│   │   │   ├── embed.py
│   │   │   ├── summarize.py
│   │   │   ├── auto_tag.py
│   │   │   ├── chat.py
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── sensitivity_router.py  # local vs cloud routing
│   │   │   ├── embedding.py           # embedding generation + chunking
│   │   │   ├── llm.py                 # unified LLM interface
│   │   │   └── rag.py                 # retrieval-augmented generation
│   │   └── worker.py              # Redis job consumer
│   └── tests/
│       ├── test_embed.py
│       ├── test_sensitivity_router.py
│       ├── test_rag.py
│       └── test_auto_tag.py
```

---

## Task 1: Project Scaffolding & Docker

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `web/Dockerfile`
- Create: `web/package.json`
- Create: `ai-sidecar/Dockerfile`
- Create: `ai-sidecar/requirements.txt`
- Create: `ai-sidecar/pyproject.toml`
- Create: `ai-sidecar/src/main.py`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
node_modules/
.next/
.env
*.env.local
__pycache__/
*.pyc
.venv/
dist/
.turbo/
coverage/
```

- [ ] **Step 2: Create `.env.example`**

```env
# Database
DATABASE_URL=postgresql://brain:brain@localhost:5432/secondbrain

# Redis
REDIS_URL=redis://localhost:6379

# MinIO (S3-compatible)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=secondbrain

# AI Sidecar
AI_SIDECAR_URL=http://localhost:8000

# NextAuth
NEXTAUTH_SECRET=change-me-in-production
NEXTAUTH_URL=http://localhost:3000

# AI — Cloud
ANTHROPIC_API_KEY=

# AI — Local
OLLAMA_BASE_URL=http://localhost:11434

# Sensitivity default: "local" | "cloud" | "hybrid"
AI_ROUTING_MODE=hybrid
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: brain
      POSTGRES_PASSWORD: brain
      POSTGRES_DB: secondbrain
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U brain"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://brain:brain@postgres:5432/secondbrain
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      S3_BUCKET: secondbrain
      AI_SIDECAR_URL: http://ai-sidecar:8000
      NEXTAUTH_SECRET: dev-secret-change-in-prod
      NEXTAUTH_URL: http://localhost:3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./web/src:/app/src
      - ./web/prisma:/app/prisma

  ai-sidecar:
    build:
      context: ./ai-sidecar
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://brain:brain@postgres:5432/secondbrain
      REDIS_URL: redis://redis:6379
      OLLAMA_BASE_URL: http://host.docker.internal:11434
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      AI_ROUTING_MODE: ${AI_ROUTING_MODE:-hybrid}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  pgdata:
  miniodata:
```

- [ ] **Step 4: Create `web/package.json`**

```json
{
  "name": "second-brain-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@prisma/client": "^6.6.0",
    "next-auth": "^5.0.0-beta.25",
    "bcryptjs": "^3.0.2",
    "ioredis": "^5.6.1",
    "@tiptap/react": "^2.12.0",
    "@tiptap/starter-kit": "^2.12.0",
    "@tiptap/extension-placeholder": "^2.12.0",
    "@tiptap/extension-code-block-lowlight": "^2.12.0",
    "@tanstack/react-query": "^5.75.0",
    "zustand": "^5.0.0",
    "zod": "^3.24.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.2.0",
    "lucide-react": "^0.487.0",
    "cmdk": "^1.1.0",
    "reactflow": "^11.11.0",
    "lowlight": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.1.0",
    "@types/bcryptjs": "^3.0.0",
    "prisma": "^6.6.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/postcss": "^4.1.0",
    "postcss": "^8.5.0",
    "vitest": "^3.1.0",
    "@vitejs/plugin-react": "^4.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.3.0"
  }
}
```

- [ ] **Step 5: Create `web/Dockerfile`**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

- [ ] **Step 6: Create `ai-sidecar/requirements.txt`**

```
fastapi==0.115.12
uvicorn[standard]==0.34.2
asyncpg==0.30.0
pgvector==0.3.6
redis==5.3.0
httpx==0.28.1
anthropic==0.52.0
pydantic==2.11.1
pydantic-settings==2.9.1
python-multipart==0.0.20
numpy==2.2.4
tiktoken==0.9.0
pytest==8.3.5
pytest-asyncio==0.26.0
```

- [ ] **Step 7: Create `ai-sidecar/pyproject.toml`**

```toml
[project]
name = "second-brain-ai-sidecar"
version = "0.1.0"
requires-python = ">=3.12"

[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = ["src"]
```

- [ ] **Step 8: Create `ai-sidecar/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 9: Create `ai-sidecar/src/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="Second Brain AI Sidecar")


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 10: Initialize git and create Next.js config files**

Create `web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `web/next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

Create `web/postcss.config.mjs`:
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

Create `web/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 11: Verify Docker Compose starts**

Run: `docker-compose up -d postgres redis minio`
Expected: All three services healthy.

Run: `docker-compose ps`
Expected: postgres, redis, minio all show "Up (healthy)" or "Up".

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffolding with Docker Compose, Next.js, and AI sidecar skeleton"
```

---

## Task 2: Database Schema (Prisma)

**Files:**
- Create: `web/prisma/schema.prisma`
- Create: `web/src/lib/db.ts`

- [ ] **Step 1: Create Prisma schema for Tier 1 entities**

Create `web/prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), pg_trgm]
}

model User {
  id           String         @id @default(uuid()) @db.Uuid
  email        String         @unique
  passwordHash String         @map("password_hash")
  avatarUrl    String?        @map("avatar_url")
  settings     Json           @default("{}")
  createdAt    DateTime       @default(now()) @map("created_at") @db.Timestamptz()
  notes        Note[]
  journalEntries JournalEntry[]
  tags         Tag[]
  aiJobLogs    AIJobLog[]

  @@map("users")
}

model Note {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  title        String    @default("")
  content      Json      @default("{}")
  contentPlain String    @default("") @map("content_plain")
  parentId     String?   @map("parent_id") @db.Uuid
  isSensitive  Boolean   @default(false) @map("is_sensitive")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz()
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz()

  user         User      @relation(fields: [userId], references: [id])
  parent       Note?     @relation("NoteHierarchy", fields: [parentId], references: [id])
  children     Note[]    @relation("NoteHierarchy")
  outgoingLinks NoteLink[] @relation("NoteLinksSource")
  incomingLinks NoteLink[] @relation("NoteLinksTarget")
  taggables    Taggable[]

  @@index([userId, deletedAt])
  @@index([parentId])
  @@map("notes")
}

model NoteLink {
  sourceId String @map("source_id") @db.Uuid
  targetId String @map("target_id") @db.Uuid
  context  String @default("")

  source   Note   @relation("NoteLinksSource", fields: [sourceId], references: [id], onDelete: Cascade)
  target   Note   @relation("NoteLinksTarget", fields: [targetId], references: [id], onDelete: Cascade)

  @@id([sourceId, targetId])
  @@map("note_links")
}

model JournalEntry {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  date         DateTime  @db.Date
  content      Json      @default("{}")
  contentPlain String    @default("") @map("content_plain")
  mood         Int?      @db.SmallInt
  energy       Int?      @db.SmallInt
  isSensitive  Boolean   @default(true) @map("is_sensitive")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz()
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz()

  user         User      @relation(fields: [userId], references: [id])
  taggables    Taggable[]

  @@unique([userId, date])
  @@index([userId, deletedAt])
  @@map("journal_entries")
}

model Tag {
  id        String     @id @default(uuid()) @db.Uuid
  userId    String     @map("user_id") @db.Uuid
  name      String
  color     String     @default("#6366f1")
  user      User       @relation(fields: [userId], references: [id])
  taggables Taggable[]

  @@unique([userId, name])
  @@map("tags")
}

model Taggable {
  tagId      String @map("tag_id") @db.Uuid
  entityType String @map("entity_type")
  entityId   String @map("entity_id") @db.Uuid

  tag        Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  note       Note?  @relation(fields: [entityId], references: [id], map: "taggable_note_fk")
  journalEntry JournalEntry? @relation(fields: [entityId], references: [id], map: "taggable_journal_fk")

  @@id([tagId, entityType, entityId])
  @@index([entityType, entityId])
  @@map("taggables")
}

model EmbeddingChunk {
  id         String   @id @default(uuid()) @db.Uuid
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id") @db.Uuid
  chunkIndex Int      @map("chunk_index") @db.SmallInt
  chunkText  String   @map("chunk_text")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz()

  @@index([entityType, entityId])
  @@map("embedding_chunks")
}

model AIJobLog {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  entityType  String    @map("entity_type")
  entityId    String    @map("entity_id") @db.Uuid
  jobType     String    @map("job_type")
  status      String    @default("queued")
  routedTo    String?   @map("routed_to")
  result      Json?
  error       String?
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  completedAt DateTime? @map("completed_at") @db.Timestamptz()

  user        User      @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([status])
  @@map("ai_job_logs")
}
```

- [ ] **Step 2: Add pgvector column via raw migration**

Prisma doesn't natively support `vector` columns. After the initial migration, we add the embedding column via a raw SQL migration.

Create `web/prisma/migrations/00000000000001_add_vector_column/migration.sql`:

```sql
-- Add vector extension (already enabled via schema.prisma extensions, but ensure it exists)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to embedding_chunks
ALTER TABLE embedding_chunks ADD COLUMN embedding vector(768);

-- Create HNSW index for fast similarity search
CREATE INDEX embedding_chunks_embedding_idx ON embedding_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Add full-text search index on notes
ALTER TABLE notes ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_plain, ''))) STORED;
CREATE INDEX notes_search_idx ON notes USING gin(search_vector);

-- Add full-text search index on journal entries
ALTER TABLE journal_entries ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content_plain, ''))) STORED;
CREATE INDEX journal_entries_search_idx ON journal_entries USING gin(search_vector);
```

- [ ] **Step 3: Create Prisma client singleton**

Create `web/src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 4: Run migration**

Run: `cd web && npx prisma migrate dev --name init`
Expected: Migration applied, client generated.

Run: `npx prisma migrate dev --name add_vector_columns --create-only`
Then manually replace the generated SQL with the content from Step 2, then:
Run: `npx prisma migrate dev`
Expected: Both migrations applied.

- [ ] **Step 5: Commit**

```bash
git add web/prisma/ web/src/lib/db.ts
git commit -m "feat: Prisma schema for Tier 1 — users, notes, journal, tags, embeddings, AI job log"
```

---

## Task 3: Auth (NextAuth.js v5)

**Files:**
- Create: `web/src/lib/auth.ts`
- Create: `web/src/lib/auth-guard.ts`
- Create: `web/src/app/api/v1/auth/[...nextauth]/route.ts`
- Create: `web/src/app/(auth)/login/page.tsx`
- Create: `web/src/app/(auth)/register/page.tsx`
- Create: `web/src/app/api/v1/auth/register/route.ts`
- Test: `web/__tests__/lib/auth-guard.test.ts`

- [ ] **Step 1: Write failing test for auth guard**

Create `web/__tests__/lib/auth-guard.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { getAuthUser } from "@/lib/auth-guard";

describe("getAuthUser", () => {
  it("returns user when session exists", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      expires: new Date().toISOString(),
    } as any);

    const user = await getAuthUser();
    expect(user).toEqual({ id: "user-1", email: "test@test.com" });
  });

  it("returns null when no session", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const user = await getAuthUser();
    expect(user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run __tests__/lib/auth-guard.test.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Create NextAuth config**

Create `web/src/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const valid = await compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

- [ ] **Step 4: Create auth guard helper**

Create `web/src/lib/auth-guard.ts`:

```typescript
import { auth } from "./auth";

export async function getAuthUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
```

- [ ] **Step 5: Run auth guard test**

Run: `cd web && npx vitest run __tests__/lib/auth-guard.test.ts`
Expected: PASS.

- [ ] **Step 6: Create API response helpers**

Create `web/src/lib/api-response.ts`:

```typescript
import { NextResponse } from "next/server";

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, code: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, code, details }, { status });
}

export function unauthorized() {
  return error("Unauthorized", "UNAUTHORIZED", 401);
}

export function notFound(resource: string) {
  return error(`${resource} not found`, "NOT_FOUND", 404);
}

export function badRequest(message: string, details?: unknown) {
  return error(message, "BAD_REQUEST", 400, details);
}
```

- [ ] **Step 7: Create NextAuth route handler**

Create `web/src/app/api/v1/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 8: Create register endpoint**

Create `web/src/app/api/v1/auth/register/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { success, badRequest, error } from "@/lib/api-response";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const { email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return error("Email already registered", "CONFLICT", 409);
  }

  const passwordHash = await hash(password, 12);
  const user = await db.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  });

  return success(user, 201);
}
```

- [ ] **Step 9: Create login page**

Create `web/src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMsg("Invalid email or password");
    } else {
      router.push("/notes");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-bold">Sign In</h1>
        {errorMsg && (
          <p className="text-sm text-red-500">{errorMsg}</p>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
          required
        />
        <button
          type="submit"
          className="w-full rounded bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
        >
          Sign In
        </button>
        <p className="text-center text-sm text-gray-500">
          No account?{" "}
          <a href="/register" className="text-indigo-600 hover:underline">
            Register
          </a>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 10: Create register page**

Create `web/src/app/(auth)/register/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErrorMsg(data.error || "Registration failed");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-bold">Create Account</h1>
        {errorMsg && (
          <p className="text-sm text-red-500">{errorMsg}</p>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
          minLength={8}
          required
        />
        <button
          type="submit"
          className="w-full rounded bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700"
        >
          Register
        </button>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-indigo-600 hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 11: Create root layout with providers**

Create `web/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Your personal knowledge OS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

Create `web/src/app/globals.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 12: Commit**

```bash
git add web/src/lib/auth.ts web/src/lib/auth-guard.ts web/src/lib/api-response.ts \
  web/src/app/api/v1/auth/ web/src/app/\(auth\)/ web/src/app/layout.tsx \
  web/src/app/globals.css web/__tests__/lib/auth-guard.test.ts
git commit -m "feat: auth — NextAuth v5 with credentials provider, register endpoint, login/register pages"
```

---

## Task 4: Notes CRUD API

**Files:**
- Create: `web/src/app/api/v1/notes/route.ts`
- Create: `web/src/app/api/v1/notes/[id]/route.ts`
- Create: `web/src/lib/tiptap-utils.ts`
- Test: `web/__tests__/lib/tiptap-utils.test.ts`
- Test: `web/__tests__/api/notes.test.ts`

- [ ] **Step 1: Write failing test for tiptap-utils**

Create `web/__tests__/lib/tiptap-utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractPlainText } from "@/lib/tiptap-utils";

describe("extractPlainText", () => {
  it("extracts text from a simple paragraph", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe("Hello world");
  });

  it("joins multiple paragraphs with newlines", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second" }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe("First\nSecond");
  });

  it("handles empty doc", () => {
    const doc = { type: "doc", content: [] };
    expect(extractPlainText(doc)).toBe("");
  });

  it("handles nested content (headings, lists)", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item one" }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe("Title\nItem one");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run __tests__/lib/tiptap-utils.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `extractPlainText`**

Create `web/src/lib/tiptap-utils.ts`:

```typescript
interface TiptapNode {
  type: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
}

export function extractPlainText(doc: TiptapNode): string {
  const lines: string[] = [];
  collectText(doc, lines);
  return lines.join("\n");
}

function collectText(node: TiptapNode, lines: string[]): void {
  if (node.type === "text" && node.text) {
    const lastIdx = lines.length - 1;
    if (lastIdx >= 0) {
      lines[lastIdx] += node.text;
    } else {
      lines.push(node.text);
    }
    return;
  }

  const isBlock = [
    "paragraph",
    "heading",
    "listItem",
    "codeBlock",
    "blockquote",
  ].includes(node.type);

  if (isBlock) {
    lines.push("");
  }

  if (node.content) {
    for (const child of node.content) {
      collectText(child, lines);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run __tests__/lib/tiptap-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Create notes list + create endpoint**

Create `web/src/app/api/v1/notes/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";

const createNoteSchema = z.object({
  title: z.string().default(""),
  content: z.any().default({}),
  parentId: z.string().uuid().nullable().optional(),
  isSensitive: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const parentId = searchParams.get("parentId") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;

  const where = {
    userId: user.id!,
    deletedAt: null,
    ...(parentId !== undefined ? { parentId: parentId || null } : {}),
    ...(tag
      ? { taggables: { some: { tag: { name: tag } } } }
      : {}),
  };

  const [notes, total] = await Promise.all([
    db.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        contentPlain: true,
        parentId: true,
        isSensitive: true,
        createdAt: true,
        updatedAt: true,
        taggables: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    db.note.count({ where }),
  ]);

  const formatted = notes.map((n) => ({
    ...n,
    contentPlain: n.contentPlain.slice(0, 200),
    tags: n.taggables.map((t) => t.tag),
    taggables: undefined,
  }));

  return success({ data: formatted, total, page, limit });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const { title, content, parentId, isSensitive } = parsed.data;
  const contentPlain = extractPlainText(content);

  const note = await db.note.create({
    data: {
      userId: user.id!,
      title,
      content,
      contentPlain,
      parentId: parentId ?? null,
      isSensitive,
    },
  });

  return success(note, 201);
}
```

- [ ] **Step 6: Create notes get/update/delete endpoint**

Create `web/src/app/api/v1/notes/[id]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, notFound, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";

const updateNoteSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isSensitive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const note = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
    include: {
      taggables: {
        select: { tag: { select: { id: true, name: true, color: true } } },
      },
      children: {
        where: { deletedAt: null },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      },
    },
  });

  if (!note) return notFound("Note");

  return success({
    ...note,
    tags: note.taggables.map((t) => t.tag),
    taggables: undefined,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const existing = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
  });
  if (!existing) return notFound("Note");

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.content !== undefined) {
    data.contentPlain = extractPlainText(parsed.data.content);
  }

  const note = await db.note.update({ where: { id }, data });

  return success(note);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const existing = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
  });
  if (!existing) return notFound("Note");

  await db.note.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return success({ deleted: true });
}
```

- [ ] **Step 7: Commit**

```bash
git add web/src/app/api/v1/notes/ web/src/lib/tiptap-utils.ts web/__tests__/lib/tiptap-utils.test.ts
git commit -m "feat: notes CRUD API — list, create, get, update, soft delete with tiptap plain text extraction"
```

---

## Task 5: Notes Bidirectional Links API

**Files:**
- Create: `web/src/app/api/v1/notes/[id]/links/route.ts`
- Create: `web/src/app/api/v1/notes/[id]/backlinks/route.ts`
- Create: `web/src/app/api/v1/notes/graph/route.ts`

- [ ] **Step 1: Create link sync logic in notes update**

When a note is saved, parse `[[...]]` references from content and sync `NoteLink` records.

Add to `web/src/lib/tiptap-utils.ts`:

```typescript
export function extractWikiLinks(doc: TiptapNode): string[] {
  const text = extractPlainText(doc);
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}
```

- [ ] **Step 2: Update note PUT to sync links**

In `web/src/app/api/v1/notes/[id]/route.ts`, add after the `db.note.update` call in the PUT handler:

```typescript
if (parsed.data.content !== undefined) {
  const linkTitles = extractWikiLinks(parsed.data.content);

  const targetNotes = await db.note.findMany({
    where: {
      userId: user.id!,
      title: { in: linkTitles },
      deletedAt: null,
    },
    select: { id: true },
  });

  await db.noteLink.deleteMany({ where: { sourceId: id } });

  if (targetNotes.length > 0) {
    await db.noteLink.createMany({
      data: targetNotes.map((t) => ({
        sourceId: id,
        targetId: t.id,
        context: "",
      })),
      skipDuplicates: true,
    });
  }
}
```

Add import: `import { extractPlainText, extractWikiLinks } from "@/lib/tiptap-utils";`

- [ ] **Step 3: Create links endpoint**

Create `web/src/app/api/v1/notes/[id]/links/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const note = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
  });
  if (!note) return notFound("Note");

  const outgoing = await db.noteLink.findMany({
    where: { sourceId: id },
    select: {
      target: { select: { id: true, title: true } },
    },
  });

  const incoming = await db.noteLink.findMany({
    where: { targetId: id },
    select: {
      source: { select: { id: true, title: true } },
    },
  });

  return success({
    outgoing: outgoing.map((l) => l.target),
    incoming: incoming.map((l) => l.source),
  });
}
```

- [ ] **Step 4: Create backlinks endpoint**

Create `web/src/app/api/v1/notes/[id]/backlinks/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, notFound, unauthorized } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { id } = await params;

  const note = await db.note.findFirst({
    where: { id, userId: user.id!, deletedAt: null },
  });
  if (!note) return notFound("Note");

  const backlinks = await db.noteLink.findMany({
    where: { targetId: id },
    select: {
      source: {
        select: { id: true, title: true, contentPlain: true, updatedAt: true },
      },
      context: true,
    },
  });

  return success(
    backlinks.map((l) => ({
      ...l.source,
      contentPlain: l.source.contentPlain.slice(0, 200),
      linkContext: l.context,
    }))
  );
}
```

- [ ] **Step 5: Create graph endpoint**

Create `web/src/app/api/v1/notes/graph/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const notes = await db.note.findMany({
    where: { userId: user.id!, deletedAt: null },
    select: { id: true, title: true },
  });

  const links = await db.noteLink.findMany({
    where: {
      source: { userId: user.id!, deletedAt: null },
      target: { deletedAt: null },
    },
    select: { sourceId: true, targetId: true },
  });

  return success({
    nodes: notes.map((n) => ({ id: n.id, label: n.title || "Untitled" })),
    edges: links.map((l) => ({ source: l.sourceId, target: l.targetId })),
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add web/src/app/api/v1/notes/ web/src/lib/tiptap-utils.ts
git commit -m "feat: bidirectional note links — wiki-link parsing, links/backlinks/graph API"
```

---

## Task 6: Tags API

**Files:**
- Create: `web/src/app/api/v1/tags/route.ts`

- [ ] **Step 1: Create tags CRUD endpoint**

Create `web/src/app/api/v1/tags/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const tags = await db.tag.findMany({
    where: { userId: user.id! },
    orderBy: { name: "asc" },
  });

  return success(tags);
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const tag = await db.tag.create({
    data: { userId: user.id!, ...parsed.data },
  });

  return success(tag, 201);
}
```

- [ ] **Step 2: Add tag assignment to notes create/update**

In the notes POST handler (`web/src/app/api/v1/notes/route.ts`), add optional `tagIds` to the create schema and create taggable records after note creation:

Add to `createNoteSchema`:
```typescript
tagIds: z.array(z.string().uuid()).default([]),
```

After `db.note.create`:
```typescript
if (parsed.data.tagIds.length > 0) {
  await db.taggable.createMany({
    data: parsed.data.tagIds.map((tagId) => ({
      tagId,
      entityType: "note",
      entityId: note.id,
    })),
  });
}
```

Similarly, add tag sync to the PUT handler in `web/src/app/api/v1/notes/[id]/route.ts`:

Add to `updateNoteSchema`:
```typescript
tagIds: z.array(z.string().uuid()).optional(),
```

After `db.note.update`:
```typescript
if (parsed.data.tagIds !== undefined) {
  await db.taggable.deleteMany({
    where: { entityType: "note", entityId: id },
  });
  if (parsed.data.tagIds.length > 0) {
    await db.taggable.createMany({
      data: parsed.data.tagIds.map((tagId) => ({
        tagId,
        entityType: "note",
        entityId: id,
      })),
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/v1/tags/ web/src/app/api/v1/notes/
git commit -m "feat: tags API — CRUD, note-tag assignment on create and update"
```

---

## Task 7: Journal CRUD API

**Files:**
- Create: `web/src/app/api/v1/journal/route.ts`
- Create: `web/src/app/api/v1/journal/[date]/route.ts`
- Create: `web/src/app/api/v1/journal/streaks/route.ts`

- [ ] **Step 1: Create journal list + create endpoint**

Create `web/src/app/api/v1/journal/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, error, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";

const createEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.any().default({}),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  isSensitive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 30)));
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    userId: user.id!,
    deletedAt: null,
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        date: true,
        contentPlain: true,
        mood: true,
        energy: true,
        isSensitive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.journalEntry.count({ where }),
  ]);

  const formatted = entries.map((e) => ({
    ...e,
    contentPlain: e.contentPlain.slice(0, 200),
  }));

  return success({ data: formatted, total, page, limit });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const { date, content, mood, energy, isSensitive } = parsed.data;
  const contentPlain = extractPlainText(content);

  const existing = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: null },
  });

  if (existing) {
    return error("Journal entry already exists for this date", "CONFLICT", 409);
  }

  const entry = await db.journalEntry.create({
    data: {
      userId: user.id!,
      date: new Date(date),
      content,
      contentPlain,
      mood,
      energy,
      isSensitive,
    },
  });

  return success(entry, 201);
}
```

- [ ] **Step 2: Create journal get/update by date endpoint**

Create `web/src/app/api/v1/journal/[date]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, notFound, unauthorized } from "@/lib/api-response";
import { extractPlainText } from "@/lib/tiptap-utils";

const updateEntrySchema = z.object({
  content: z.any().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  isSensitive: z.boolean().optional(),
});

type Params = { params: Promise<{ date: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { date } = await params;

  const entry = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: null },
    include: {
      taggables: {
        select: { tag: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  if (!entry) return notFound("Journal entry");

  return success({
    ...entry,
    tags: entry.taggables.map((t) => t.tag),
    taggables: undefined,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { date } = await params;
  const body = await req.json();
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const existing = await db.journalEntry.findFirst({
    where: { userId: user.id!, date: new Date(date), deletedAt: null },
  });
  if (!existing) return notFound("Journal entry");

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.content !== undefined) {
    data.contentPlain = extractPlainText(parsed.data.content);
  }

  const entry = await db.journalEntry.update({
    where: { id: existing.id },
    data,
  });

  return success(entry);
}
```

- [ ] **Step 3: Create streaks endpoint**

Create `web/src/app/api/v1/journal/streaks/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const entries = await db.journalEntry.findMany({
    where: { userId: user.id!, deletedAt: null },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  const dates = entries.map((e) => e.date.toISOString().split("T")[0]);

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  const today = new Date().toISOString().split("T")[0];
  const dateSet = new Set(dates);

  const d = new Date();
  let checking = true;
  while (checking) {
    const dateStr = d.toISOString().split("T")[0];
    if (dateSet.has(dateStr)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      checking = false;
    }
  }
  currentStreak = streak;

  streak = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        streak++;
      } else {
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  return success({
    currentStreak,
    longestStreak,
    totalEntries: dates.length,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/api/v1/journal/
git commit -m "feat: journal API — create, get by date, update, list with date range, streaks"
```

---

## Task 8: Full-Text Search API

**Files:**
- Create: `web/src/app/api/v1/search/route.ts`
- Create: `web/src/lib/search.ts`

- [ ] **Step 1: Create search logic**

Create `web/src/lib/search.ts`:

```typescript
import { db } from "./db";

interface SearchResult {
  id: string;
  type: "note" | "journal_entry";
  title: string;
  snippet: string;
  updatedAt: Date;
  rank: number;
}

export async function fullTextSearch(
  userId: string,
  query: string,
  limit = 20
): Promise<SearchResult[]> {
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .map((w) => `${w}:*`)
    .join(" & ");

  const results = await db.$queryRawUnsafe<SearchResult[]>(
    `
    SELECT * FROM (
      SELECT
        id,
        'note' as type,
        title,
        LEFT(content_plain, 200) as snippet,
        updated_at as "updatedAt",
        ts_rank(search_vector, to_tsquery('english', $1)) as rank
      FROM notes
      WHERE user_id = $2::uuid
        AND deleted_at IS NULL
        AND search_vector @@ to_tsquery('english', $1)

      UNION ALL

      SELECT
        id,
        'journal_entry' as type,
        TO_CHAR(date, 'YYYY-MM-DD') as title,
        LEFT(content_plain, 200) as snippet,
        updated_at as "updatedAt",
        ts_rank(search_vector, to_tsquery('english', $1)) as rank
      FROM journal_entries
      WHERE user_id = $2::uuid
        AND deleted_at IS NULL
        AND search_vector @@ to_tsquery('english', $1)
    ) results
    ORDER BY rank DESC
    LIMIT $3
    `,
    tsQuery,
    userId,
    limit
  );

  return results;
}
```

- [ ] **Step 2: Create search endpoint**

Create `web/src/app/api/v1/search/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { fullTextSearch } from "@/lib/search";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return badRequest("Query parameter 'q' is required");
  }

  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20)));

  const results = await fullTextSearch(user.id!, q, limit);

  return success({ data: results, query: q });
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/search.ts web/src/app/api/v1/search/
git commit -m "feat: full-text search API — PostgreSQL tsvector across notes and journal entries"
```

---

## Task 9: AI Sidecar — Config, DB, Sensitivity Router

**Files:**
- Create: `ai-sidecar/src/config.py`
- Create: `ai-sidecar/src/db.py`
- Create: `ai-sidecar/src/services/sensitivity_router.py`
- Create: `ai-sidecar/src/services/llm.py`
- Test: `ai-sidecar/tests/test_sensitivity_router.py`

- [ ] **Step 1: Write failing test for sensitivity router**

Create `ai-sidecar/tests/test_sensitivity_router.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from services.sensitivity_router import SensitivityRouter


def test_routes_sensitive_to_local():
    router = SensitivityRouter(mode="hybrid")
    provider = router.get_provider(is_sensitive=True)
    assert provider == "local"


def test_routes_non_sensitive_to_cloud():
    router = SensitivityRouter(mode="hybrid")
    provider = router.get_provider(is_sensitive=False)
    assert provider == "cloud"


def test_force_local_mode():
    router = SensitivityRouter(mode="local")
    assert router.get_provider(is_sensitive=False) == "local"
    assert router.get_provider(is_sensitive=True) == "local"


def test_force_cloud_mode():
    router = SensitivityRouter(mode="cloud")
    assert router.get_provider(is_sensitive=False) == "cloud"
    assert router.get_provider(is_sensitive=True) == "cloud"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ai-sidecar && python -m pytest tests/test_sensitivity_router.py -v`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create config**

Create `ai-sidecar/src/config.py`:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://brain:brain@localhost:5432/secondbrain"
    redis_url: str = "redis://localhost:6379"
    ollama_base_url: str = "http://localhost:11434"
    anthropic_api_key: str = ""
    ai_routing_mode: str = "hybrid"
    embedding_model_local: str = "nomic-embed-text"
    chat_model_local: str = "llama3"
    chat_model_cloud: str = "claude-sonnet-4-6-20250514"
    embedding_dimension: int = 768
    chunk_size: int = 500
    chunk_overlap: int = 50

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: Create DB connection**

Create `ai-sidecar/src/db.py`:

```python
import asyncpg
from config import settings

pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=2,
            max_size=10,
        )
    return pool


async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None
```

- [ ] **Step 5: Create sensitivity router**

Create `ai-sidecar/src/services/sensitivity_router.py`:

```python
class SensitivityRouter:
    def __init__(self, mode: str = "hybrid"):
        self.mode = mode

    def get_provider(self, is_sensitive: bool) -> str:
        if self.mode == "local":
            return "local"
        if self.mode == "cloud":
            return "cloud"
        return "local" if is_sensitive else "cloud"
```

- [ ] **Step 6: Run sensitivity router test**

Run: `cd ai-sidecar && python -m pytest tests/test_sensitivity_router.py -v`
Expected: PASS.

- [ ] **Step 7: Create unified LLM interface**

Create `ai-sidecar/src/services/llm.py`:

```python
import httpx
import anthropic
from config import settings


async def generate_embedding(text: str, provider: str) -> list[float]:
    if provider == "local":
        return await _ollama_embed(text)
    return await _cloud_embed(text)


async def generate_text(prompt: str, system: str, provider: str) -> str:
    if provider == "local":
        return await _ollama_generate(prompt, system)
    return await _cloud_generate(prompt, system)


async def _ollama_embed(text: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.embedding_model_local, "prompt": text},
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


async def _cloud_embed(text: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.embedding_model_local, "prompt": text},
            timeout=60.0,
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


async def _ollama_generate(prompt: str, system: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.chat_model_local,
                "prompt": prompt,
                "system": system,
                "stream": False,
            },
            timeout=120.0,
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def _cloud_generate(prompt: str, system: str) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model=settings.chat_model_cloud,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
```

- [ ] **Step 8: Commit**

```bash
git add ai-sidecar/src/ ai-sidecar/tests/
git commit -m "feat: AI sidecar — config, DB pool, sensitivity router, unified LLM interface"
```

---

## Task 10: AI Sidecar — Embedding Service & Worker

**Files:**
- Create: `ai-sidecar/src/services/embedding.py`
- Create: `ai-sidecar/src/routes/embed.py`
- Create: `ai-sidecar/src/worker.py`
- Create: `web/src/lib/ai-client.ts`
- Create: `web/src/lib/queue.ts`
- Test: `ai-sidecar/tests/test_embed.py`

- [ ] **Step 1: Create embedding service with chunking**

Create `ai-sidecar/src/services/embedding.py`:

```python
import tiktoken
from pgvector.asyncpg import register_vector
from config import settings
from db import get_pool
from services.llm import generate_embedding
from services.sensitivity_router import SensitivityRouter

router = SensitivityRouter(mode=settings.ai_routing_mode)
enc = tiktoken.get_encoding("cl100k_base")


def chunk_text(text: str, chunk_size: int = settings.chunk_size, overlap: int = settings.chunk_overlap) -> list[str]:
    tokens = enc.encode(text)
    if len(tokens) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunks.append(enc.decode(chunk_tokens))
        start = end - overlap

    return chunks


async def embed_entity(entity_type: str, entity_id: str, text: str, is_sensitive: bool) -> int:
    provider = router.get_provider(is_sensitive)
    chunks = chunk_text(text)

    pool = await get_pool()
    async with pool.acquire() as conn:
        await register_vector(conn)

        await conn.execute(
            "DELETE FROM embedding_chunks WHERE entity_type = $1 AND entity_id = $2::uuid",
            entity_type,
            entity_id,
        )

        for i, chunk in enumerate(chunks):
            embedding = await generate_embedding(chunk, provider)
            await conn.execute(
                """
                INSERT INTO embedding_chunks (id, entity_type, entity_id, chunk_index, chunk_text, embedding, created_at)
                VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5::vector, NOW())
                """,
                entity_type,
                entity_id,
                i,
                chunk,
                str(embedding),
            )

    return len(chunks)
```

- [ ] **Step 2: Create embed route**

Create `ai-sidecar/src/routes/embed.py`:

```python
from fastapi import APIRouter
from pydantic import BaseModel
from services.embedding import embed_entity

router = APIRouter()


class EmbedRequest(BaseModel):
    entity_type: str
    entity_id: str
    text: str
    is_sensitive: bool = False


class EmbedResponse(BaseModel):
    chunks_created: int


@router.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    chunks = await embed_entity(req.entity_type, req.entity_id, req.text, req.is_sensitive)
    return EmbedResponse(chunks_created=chunks)
```

- [ ] **Step 3: Create Redis worker for async processing**

Create `ai-sidecar/src/worker.py`:

```python
import asyncio
import json
import redis.asyncio as redis
from config import settings
from services.embedding import embed_entity
from db import get_pool

QUEUE_KEY = "ai:jobs"
DEBOUNCE_KEY_PREFIX = "ai:debounce:"
DEBOUNCE_SECONDS = 300


async def process_job(job_data: dict):
    job_type = job_data["type"]

    if job_type == "embed":
        await embed_entity(
            entity_type=job_data["entity_type"],
            entity_id=job_data["entity_id"],
            text=job_data["text"],
            is_sensitive=job_data.get("is_sensitive", False),
        )

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE ai_job_logs SET status = 'completed', completed_at = NOW()
            WHERE entity_type = $1 AND entity_id = $2::uuid AND job_type = $3 AND status = 'processing'
            """,
            job_data["entity_type"],
            job_data["entity_id"],
            job_type,
        )


async def run_worker():
    r = redis.from_url(settings.redis_url)

    while True:
        result = await r.brpop(QUEUE_KEY, timeout=5)
        if result is None:
            continue

        _, raw = result
        job_data = json.loads(raw)

        try:
            await process_job(job_data)
        except Exception as e:
            pool = await get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE ai_job_logs SET status = 'failed', error = $4, completed_at = NOW()
                    WHERE entity_type = $1 AND entity_id = $2::uuid AND job_type = $3 AND status = 'processing'
                    """,
                    job_data.get("entity_type", ""),
                    job_data.get("entity_id", ""),
                    job_data.get("type", ""),
                    str(e),
                )


if __name__ == "__main__":
    asyncio.run(run_worker())
```

- [ ] **Step 4: Register routes in main.py**

Update `ai-sidecar/src/main.py`:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from db import get_pool, close_pool
from routes.embed import router as embed_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="Second Brain AI Sidecar", lifespan=lifespan)

app.include_router(embed_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Create Next.js AI client and queue helpers**

Create `web/src/lib/ai-client.ts`:

```typescript
const AI_SIDECAR_URL = process.env.AI_SIDECAR_URL ?? "http://localhost:8000";

export async function callSidecar<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AI_SIDECAR_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sidecar error (${res.status}): ${err}`);
  }

  return res.json();
}
```

Create `web/src/lib/queue.ts`:

```typescript
import Redis from "ioredis";
import { db } from "./db";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

const QUEUE_KEY = "ai:jobs";
const DEBOUNCE_PREFIX = "ai:debounce:";
const DEBOUNCE_SECONDS = 300;

export async function enqueueAIJob(
  userId: string,
  entityType: string,
  entityId: string,
  jobType: string,
  payload: Record<string, unknown>
) {
  const debounceKey = `${DEBOUNCE_PREFIX}${entityType}:${entityId}:${jobType}`;
  const existing = await redis.get(debounceKey);
  if (existing) return;

  await redis.setex(debounceKey, DEBOUNCE_SECONDS, "1");

  await db.aIJobLog.create({
    data: {
      userId,
      entityType,
      entityId,
      jobType,
      status: "queued",
    },
  });

  await redis.lpush(
    QUEUE_KEY,
    JSON.stringify({
      type: jobType,
      entity_type: entityType,
      entity_id: entityId,
      ...payload,
    })
  );
}
```

- [ ] **Step 6: Wire embedding into note save**

In `web/src/app/api/v1/notes/route.ts` POST handler, add after note creation:

```typescript
import { enqueueAIJob } from "@/lib/queue";

// After note creation:
if (contentPlain.length > 0) {
  await enqueueAIJob(user.id!, "note", note.id, "embed", {
    text: `${title}\n${contentPlain}`,
    is_sensitive: isSensitive,
  });
}
```

Similarly in `web/src/app/api/v1/notes/[id]/route.ts` PUT handler, add after update:

```typescript
import { enqueueAIJob } from "@/lib/queue";

// After note update (inside the content !== undefined block):
const updatedPlain = data.contentPlain as string ?? existing.contentPlain;
if (updatedPlain.length > 0) {
  await enqueueAIJob(user.id!, "note", id, "embed", {
    text: `${parsed.data.title ?? existing.title}\n${updatedPlain}`,
    is_sensitive: parsed.data.isSensitive ?? existing.isSensitive,
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add ai-sidecar/src/ web/src/lib/ai-client.ts web/src/lib/queue.ts web/src/app/api/v1/notes/
git commit -m "feat: AI embedding pipeline — chunked embeddings, Redis job queue, auto-embed on note save"
```

---

## Task 11: AI Sidecar — Semantic Search

**Files:**
- Modify: `web/src/lib/search.ts`
- Modify: `web/src/app/api/v1/search/route.ts`

- [ ] **Step 1: Add semantic search to search lib**

Add to `web/src/lib/search.ts`:

```typescript
import { callSidecar } from "./ai-client";

interface SemanticResult {
  entityType: string;
  entityId: string;
  chunkText: string;
  similarity: number;
}

export async function semanticSearch(
  userId: string,
  query: string,
  limit = 20
): Promise<SearchResult[]> {
  const embedding = await callSidecar<{ embedding: number[] }>("/embed-query", {
    text: query,
    is_sensitive: false,
  });

  const results = await db.$queryRawUnsafe<
    { entity_type: string; entity_id: string; chunk_text: string; similarity: number }[]
  >(
    `
    SELECT ec.entity_type, ec.entity_id, ec.chunk_text,
           1 - (ec.embedding <=> $1::vector) as similarity
    FROM embedding_chunks ec
    WHERE ec.entity_type IN ('note', 'journal_entry')
    ORDER BY ec.embedding <=> $1::vector
    LIMIT $2
    `,
    JSON.stringify(embedding.embedding),
    limit
  );

  const noteIds = results.filter((r) => r.entity_type === "note").map((r) => r.entity_id);
  const journalIds = results.filter((r) => r.entity_type === "journal_entry").map((r) => r.entity_id);

  const [notes, entries] = await Promise.all([
    noteIds.length > 0
      ? db.note.findMany({
          where: { id: { in: noteIds }, userId, deletedAt: null },
          select: { id: true, title: true, updatedAt: true },
        })
      : [],
    journalIds.length > 0
      ? db.journalEntry.findMany({
          where: { id: { in: journalIds }, userId, deletedAt: null },
          select: { id: true, date: true, updatedAt: true },
        })
      : [],
  ]);

  const noteMap = new Map(notes.map((n) => [n.id, n]));
  const journalMap = new Map(entries.map((e) => [e.id, e]));

  return results
    .map((r) => {
      if (r.entity_type === "note") {
        const note = noteMap.get(r.entity_id);
        if (!note) return null;
        return {
          id: note.id,
          type: "note" as const,
          title: note.title,
          snippet: r.chunk_text.slice(0, 200),
          updatedAt: note.updatedAt,
          rank: r.similarity,
        };
      }
      const entry = journalMap.get(r.entity_id);
      if (!entry) return null;
      return {
        id: entry.id,
        type: "journal_entry" as const,
        title: entry.date.toISOString().split("T")[0],
        snippet: r.chunk_text.slice(0, 200),
        updatedAt: entry.updatedAt,
        rank: r.similarity,
      };
    })
    .filter((r): r is SearchResult => r !== null);
}

export async function combinedSearch(
  userId: string,
  query: string,
  limit = 20
): Promise<SearchResult[]> {
  const [ftResults, semResults] = await Promise.all([
    fullTextSearch(userId, query, limit),
    semanticSearch(userId, query, limit).catch(() => []),
  ]);

  const seen = new Set<string>();
  const combined: SearchResult[] = [];

  for (const r of [...ftResults, ...semResults]) {
    const key = `${r.type}:${r.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(r);
    }
  }

  combined.sort((a, b) => b.rank - a.rank);
  return combined.slice(0, limit);
}
```

- [ ] **Step 2: Add embed-query route to sidecar**

Create `ai-sidecar/src/routes/embed.py` — add to existing file:

```python
class EmbedQueryRequest(BaseModel):
    text: str
    is_sensitive: bool = False


class EmbedQueryResponse(BaseModel):
    embedding: list[float]


@router.post("/embed-query", response_model=EmbedQueryResponse)
async def embed_query(req: EmbedQueryRequest):
    from services.sensitivity_router import SensitivityRouter
    from services.llm import generate_embedding
    from config import settings

    sr = SensitivityRouter(mode=settings.ai_routing_mode)
    provider = sr.get_provider(req.is_sensitive)
    embedding = await generate_embedding(req.text, provider)
    return EmbedQueryResponse(embedding=embedding)
```

- [ ] **Step 3: Update search endpoint to support both modes**

Update `web/src/app/api/v1/search/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { success, badRequest, unauthorized } from "@/lib/api-response";
import { fullTextSearch, semanticSearch, combinedSearch } from "@/lib/search";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return badRequest("Query parameter 'q' is required");
  }

  const mode = searchParams.get("mode") ?? "combined";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  let results;
  switch (mode) {
    case "semantic":
      results = await semanticSearch(user.id!, q, limit);
      break;
    case "fulltext":
      results = await fullTextSearch(user.id!, q, limit);
      break;
    default:
      results = await combinedSearch(user.id!, q, limit);
  }

  return success({ data: results, query: q, mode });
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/search.ts web/src/app/api/v1/search/ ai-sidecar/src/routes/embed.py
git commit -m "feat: semantic search — pgvector similarity search, combined full-text + semantic mode"
```

---

## Task 12: AI Sidecar — Auto-Tagging & Summarization

**Files:**
- Create: `ai-sidecar/src/routes/auto_tag.py`
- Create: `ai-sidecar/src/routes/summarize.py`
- Create: `web/src/app/api/v1/ai/suggestions/route.ts`
- Create: `web/src/app/api/v1/ai/summarize/[type]/[id]/route.ts`

- [ ] **Step 1: Create auto-tag route**

Create `ai-sidecar/src/routes/auto_tag.py`:

```python
from fastapi import APIRouter
from pydantic import BaseModel
from services.sensitivity_router import SensitivityRouter
from services.llm import generate_text
from config import settings

router = APIRouter()
sr = SensitivityRouter(mode=settings.ai_routing_mode)

SYSTEM_PROMPT = """You are a tagging assistant. Given content, suggest 1-5 short tags (1-3 words each).
Return ONLY a JSON array of strings. Example: ["machine-learning", "python", "tutorial"]
Do not include explanations."""


class AutoTagRequest(BaseModel):
    text: str
    is_sensitive: bool = False
    existing_tags: list[str] = []


class AutoTagResponse(BaseModel):
    suggested_tags: list[str]


@router.post("/auto-tag", response_model=AutoTagResponse)
async def auto_tag(req: AutoTagRequest):
    provider = sr.get_provider(req.is_sensitive)

    prompt = f"Content:\n{req.text[:2000]}\n\nExisting tags in system: {', '.join(req.existing_tags) if req.existing_tags else 'none'}\n\nSuggest tags:"

    response = await generate_text(prompt, SYSTEM_PROMPT, provider)

    import json
    try:
        tags = json.loads(response.strip())
        if isinstance(tags, list):
            return AutoTagResponse(suggested_tags=[str(t).lower().strip() for t in tags[:5]])
    except json.JSONDecodeError:
        pass

    return AutoTagResponse(suggested_tags=[])
```

- [ ] **Step 2: Create summarize route**

Create `ai-sidecar/src/routes/summarize.py`:

```python
from fastapi import APIRouter
from pydantic import BaseModel
from services.sensitivity_router import SensitivityRouter
from services.llm import generate_text
from config import settings

router = APIRouter()
sr = SensitivityRouter(mode=settings.ai_routing_mode)

SYSTEM_PROMPT = """You are a summarization assistant. Provide a concise summary of the given content.
Keep it to 2-4 sentences. Focus on key points and actionable information."""


class SummarizeRequest(BaseModel):
    text: str
    is_sensitive: bool = False


class SummarizeResponse(BaseModel):
    summary: str


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(req: SummarizeRequest):
    provider = sr.get_provider(req.is_sensitive)
    summary = await generate_text(
        f"Summarize the following:\n\n{req.text[:4000]}",
        SYSTEM_PROMPT,
        provider,
    )
    return SummarizeResponse(summary=summary.strip())
```

- [ ] **Step 3: Register new routes in main.py**

Update `ai-sidecar/src/main.py`:

```python
from routes.embed import router as embed_router
from routes.auto_tag import router as auto_tag_router
from routes.summarize import router as summarize_router

# After app creation:
app.include_router(embed_router)
app.include_router(auto_tag_router)
app.include_router(summarize_router)
```

- [ ] **Step 4: Create AI suggestions endpoint (Next.js)**

Create `web/src/app/api/v1/ai/suggestions/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const jobs = await db.aIJobLog.findMany({
    where: {
      userId: user.id!,
      jobType: "auto_tag",
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    take: 20,
  });

  return success(jobs);
}
```

- [ ] **Step 5: Create summarize endpoint (Next.js)**

Create `web/src/app/api/v1/ai/summarize/[type]/[id]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, notFound, unauthorized, badRequest } from "@/lib/api-response";

type Params = { params: Promise<{ type: string; id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const { type, id } = await params;

  let text = "";
  let isSensitive = false;

  if (type === "note") {
    const note = await db.note.findFirst({
      where: { id, userId: user.id!, deletedAt: null },
    });
    if (!note) return notFound("Note");
    text = `${note.title}\n${note.contentPlain}`;
    isSensitive = note.isSensitive;
  } else if (type === "journal_entry") {
    const entry = await db.journalEntry.findFirst({
      where: { id, userId: user.id!, deletedAt: null },
    });
    if (!entry) return notFound("Journal entry");
    text = entry.contentPlain;
    isSensitive = entry.isSensitive;
  } else {
    return badRequest("Invalid type. Must be 'note' or 'journal_entry'");
  }

  if (isSensitive) {
    const sidecarUrl = process.env.AI_SIDECAR_URL ?? "http://localhost:8000";
    const healthCheck = await fetch(`${sidecarUrl}/health`).catch(() => null);
    if (!healthCheck?.ok) {
      return badRequest("Sensitive content requires local AI processing, but the local model is unavailable");
    }
  }

  const result = await callSidecar<{ summary: string }>("/summarize", {
    text,
    is_sensitive: isSensitive,
  });

  return success({ summary: result.summary, entityType: type, entityId: id });
}
```

- [ ] **Step 6: Commit**

```bash
git add ai-sidecar/src/ web/src/app/api/v1/ai/
git commit -m "feat: AI auto-tagging and summarization — sidecar routes + Next.js API endpoints"
```

---

## Task 13: AI Sidecar — RAG Chat

**Files:**
- Create: `ai-sidecar/src/services/rag.py`
- Create: `ai-sidecar/src/routes/chat.py`
- Create: `web/src/app/api/v1/ai/chat/route.ts`

- [ ] **Step 1: Create RAG service**

Create `ai-sidecar/src/services/rag.py`:

```python
from pgvector.asyncpg import register_vector
from db import get_pool
from services.llm import generate_embedding, generate_text
from services.sensitivity_router import SensitivityRouter
from config import settings

sr = SensitivityRouter(mode=settings.ai_routing_mode)

SYSTEM_PROMPT = """You are a personal knowledge assistant. Answer questions using ONLY the provided context from the user's notes and journal.

Rules:
- Cite sources by their title or date in [brackets]
- If the context doesn't contain enough information, say so
- Be concise and direct
- Never make up information not present in the context"""


async def retrieve_context(query: str, user_id: str, top_k: int = 10) -> list[dict]:
    embedding = await generate_embedding(query, "local")

    pool = await get_pool()
    async with pool.acquire() as conn:
        await register_vector(conn)

        rows = await conn.fetch(
            """
            SELECT ec.entity_type, ec.entity_id, ec.chunk_text,
                   1 - (ec.embedding <=> $1::vector) as similarity
            FROM embedding_chunks ec
            JOIN (
                SELECT id, user_id, is_sensitive, 'note' as src FROM notes WHERE user_id = $2::uuid AND deleted_at IS NULL
                UNION ALL
                SELECT id, user_id, is_sensitive, 'journal_entry' as src FROM journal_entries WHERE user_id = $2::uuid AND deleted_at IS NULL
            ) entities ON ec.entity_id = entities.id AND ec.entity_type = entities.src
            WHERE entities.user_id = $2::uuid
            ORDER BY ec.embedding <=> $1::vector
            LIMIT $3
            """,
            str(embedding),
            user_id,
            top_k,
        )

    return [dict(row) for row in rows]


async def chat(query: str, user_id: str, routing_choice: str = "local") -> dict:
    chunks = await retrieve_context(query, user_id)

    if not chunks:
        return {
            "answer": "I don't have enough information in your knowledge base to answer this question.",
            "sources": [],
            "routed_to": routing_choice,
        }

    has_sensitive = False
    pool = await get_pool()
    async with pool.acquire() as conn:
        for chunk in chunks:
            if chunk["entity_type"] == "note":
                row = await conn.fetchrow(
                    "SELECT is_sensitive, title FROM notes WHERE id = $1::uuid",
                    chunk["entity_id"],
                )
            else:
                row = await conn.fetchrow(
                    "SELECT is_sensitive, TO_CHAR(date, 'YYYY-MM-DD') as title FROM journal_entries WHERE id = $1::uuid",
                    chunk["entity_id"],
                )
            if row:
                chunk["title"] = row["title"] or "Untitled"
                if row["is_sensitive"]:
                    has_sensitive = True
                    chunk["is_sensitive"] = True

    if has_sensitive and routing_choice == "cloud":
        chunks = [c for c in chunks if not c.get("is_sensitive")]

    context = "\n\n---\n\n".join(
        f"[{c.get('title', 'Unknown')}] ({c['entity_type']}):\n{c['chunk_text']}"
        for c in chunks
    )

    provider = "local" if has_sensitive and routing_choice == "local" else routing_choice
    prompt = f"Context from knowledge base:\n\n{context}\n\n---\n\nQuestion: {query}"

    answer = await generate_text(prompt, SYSTEM_PROMPT, provider)

    sources = []
    seen = set()
    for c in chunks:
        key = f"{c['entity_type']}:{c['entity_id']}"
        if key not in seen:
            seen.add(key)
            sources.append({
                "type": c["entity_type"],
                "id": c["entity_id"],
                "title": c.get("title", "Unknown"),
                "similarity": float(c["similarity"]),
            })

    return {
        "answer": answer,
        "sources": sources,
        "routed_to": provider,
        "has_sensitive_context": has_sensitive,
    }
```

- [ ] **Step 2: Create chat route**

Create `ai-sidecar/src/routes/chat.py`:

```python
from fastapi import APIRouter
from pydantic import BaseModel
from services.rag import chat

router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    user_id: str
    routing_choice: str = "local"


class Source(BaseModel):
    type: str
    id: str
    title: str
    similarity: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    routed_to: str
    has_sensitive_context: bool = False


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    result = await chat(req.query, req.user_id, req.routing_choice)
    return ChatResponse(**result)
```

- [ ] **Step 3: Register chat route in main.py**

Add to `ai-sidecar/src/main.py`:

```python
from routes.chat import router as chat_router
app.include_router(chat_router)
```

- [ ] **Step 4: Create Next.js chat endpoint**

Create `web/src/app/api/v1/ai/chat/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { callSidecar } from "@/lib/ai-client";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const chatSchema = z.object({
  query: z.string().min(1),
  routingChoice: z.enum(["local", "cloud"]).default("local"),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const result = await callSidecar<{
    answer: string;
    sources: { type: string; id: string; title: string; similarity: number }[];
    routed_to: string;
    has_sensitive_context: boolean;
  }>("/chat", {
    query: parsed.data.query,
    user_id: user.id!,
    routing_choice: parsed.data.routingChoice,
  });

  return success(result);
}
```

- [ ] **Step 5: Commit**

```bash
git add ai-sidecar/src/ web/src/app/api/v1/ai/chat/
git commit -m "feat: RAG chat — retrieval-augmented generation with source citations and sensitivity routing"
```

---

## Task 14: Markdown Import

**Files:**
- Create: `web/src/app/api/v1/import/markdown/route.ts`
- Create: `web/src/app/api/v1/import/status/[jobId]/route.ts`

- [ ] **Step 1: Create markdown import endpoint**

Create `web/src/app/api/v1/import/markdown/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { enqueueAIJob } from "@/lib/queue";
import { success, badRequest, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return badRequest("No files provided");
  }

  const results = [];

  for (const file of files) {
    if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown") && !file.name.endsWith(".txt")) {
      results.push({ file: file.name, status: "skipped", reason: "not a markdown file" });
      continue;
    }

    const text = await file.text();
    const title = file.name.replace(/\.(md|markdown|txt)$/, "");

    const tiptapContent = markdownToTiptap(text);

    const note = await db.note.create({
      data: {
        userId: user.id!,
        title,
        content: tiptapContent,
        contentPlain: text,
        isSensitive: false,
      },
    });

    await enqueueAIJob(user.id!, "note", note.id, "embed", {
      text: `${title}\n${text}`,
      is_sensitive: false,
    });

    results.push({ file: file.name, status: "imported", noteId: note.id });
  }

  return success({ imported: results.filter((r) => r.status === "imported").length, results });
}

function markdownToTiptap(markdown: string): object {
  const lines = markdown.split("\n");
  const content: object[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: "heading",
        attrs: { level: headingMatch[1].length },
        content: [{ type: "text", text: headingMatch[2] }],
      });
      continue;
    }

    if (line.trim() === "") {
      continue;
    }

    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    const textContent: object[] = [];
    let lastIndex = 0;
    let match;

    while ((match = wikiLinkRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        textContent.push({ type: "text", text: line.slice(lastIndex, match.index) });
      }
      textContent.push({ type: "text", text: `[[${match[1]}]]` });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      textContent.push({ type: "text", text: line.slice(lastIndex) });
    }

    if (textContent.length > 0) {
      content.push({ type: "paragraph", content: textContent });
    }
  }

  return { type: "doc", content };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/api/v1/import/
git commit -m "feat: markdown import — upload .md files, convert to Tiptap JSON, auto-queue embeddings"
```

---

## Task 15: Frontend — App Shell & Sidebar

**Files:**
- Create: `web/src/stores/ui-store.ts`
- Create: `web/src/components/layout/sidebar.tsx`
- Create: `web/src/app/(app)/layout.tsx`

- [ ] **Step 1: Create UI store**

Create `web/src/stores/ui-store.ts`:

```typescript
import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  chatPanelOpen: false,
  theme: "system",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
  setTheme: (theme) => set({ theme }),
}));
```

- [ ] **Step 2: Create sidebar**

Create `web/src/components/layout/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";

const NAV_ITEMS = [
  { href: "/notes", label: "Notes", icon: "📝" },
  { href: "/journal", label: "Journal", icon: "📓" },
  { href: "/search", label: "Search", icon: "🔍" },
  { href: "/ai", label: "AI Chat", icon: "🤖" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-gray-50 dark:bg-gray-900">
      <div className="p-4 font-bold text-lg">Second Brain</div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${
                active
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Create authenticated app layout**

Create `web/src/app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/stores/ web/src/components/layout/ web/src/app/\(app\)/layout.tsx
git commit -m "feat: app shell — sidebar navigation, authenticated layout, UI store"
```

---

## Task 16: Frontend — Tiptap Editor

**Files:**
- Create: `web/src/components/editor/tiptap-editor.tsx`
- Create: `web/src/components/editor/extensions/wiki-link.ts`
- Create: `web/src/components/editor/link-picker.tsx`

- [ ] **Step 1: Create base Tiptap editor component**

Create `web/src/components/editor/tiptap-editor.tsx`:

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect } from "react";

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: Record<string, unknown>;
  onUpdate: (content: Record<string, unknown>) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onUpdate,
  placeholder = "Start writing...",
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="rounded border">
      <div className="flex gap-1 border-b p-2">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="B"
        />
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="I"
        />
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          label="H1"
        />
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="List"
        />
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          label="Code"
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm ${
        active ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Create wiki-link extension**

Create `web/src/components/editor/extensions/wiki-link.ts`:

```typescript
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (title: string) => ReturnType;
    };
  }
}

export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wiki-link": "",
        class: "text-indigo-600 cursor-pointer hover:underline",
      }),
      `[[${node.attrs.title}]]`,
    ];
  },

  renderText({ node }) {
    return `[[${node.attrs.title}]]`;
  },

  addCommands() {
    return {
      insertWikiLink:
        (title: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { title },
          });
        },
    };
  },
});
```

- [ ] **Step 3: Create link picker component**

Create `web/src/components/editor/link-picker.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface LinkPickerProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (title: string) => void;
  onClose: () => void;
}

export function LinkPicker({ query, position, onSelect, onClose }: LinkPickerProps) {
  const [results, setResults] = useState<{ id: string; title: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) return;

    const controller = new AbortController();
    fetch(`/api/v1/notes?search=${encodeURIComponent(query)}&limit=5`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setResults(data.data ?? []))
      .catch(() => {});

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        onSelect(results[selectedIndex].title);
      } else if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIndex, onSelect, onClose]);

  if (results.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 w-64 rounded border bg-white shadow-lg dark:bg-gray-800"
      style={{ top: position.top, left: position.left }}
    >
      {results.map((r, i) => (
        <button
          key={r.id}
          className={`w-full px-3 py-2 text-left text-sm ${
            i === selectedIndex ? "bg-indigo-50 dark:bg-indigo-900" : ""
          }`}
          onClick={() => onSelect(r.title)}
        >
          {r.title || "Untitled"}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/editor/
git commit -m "feat: Tiptap editor — rich text with toolbar, wiki-link extension, link picker autocomplete"
```

---

## Task 17: Frontend — Notes Pages

**Files:**
- Create: `web/src/hooks/use-notes.ts`
- Create: `web/src/components/notes/note-list.tsx`
- Create: `web/src/app/(app)/notes/page.tsx`
- Create: `web/src/app/(app)/notes/[id]/page.tsx`

- [ ] **Step 1: Create notes hook**

Create `web/src/hooks/use-notes.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Note {
  id: string;
  title: string;
  contentPlain: string;
  tags: { id: string; name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
}

interface NoteDetail extends Note {
  content: Record<string, unknown>;
  parentId: string | null;
  isSensitive: boolean;
  children: { id: string; title: string }[];
}

export function useNotes(params?: { parentId?: string; tag?: string }) {
  return useQuery({
    queryKey: ["notes", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.parentId) searchParams.set("parentId", params.parentId);
      if (params?.tag) searchParams.set("tag", params.tag);
      const res = await fetch(`/api/v1/notes?${searchParams}`);
      const data = await res.json();
      return data as { data: Note[]; total: number };
    },
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/notes/${id}`);
      if (!res.ok) throw new Error("Note not found");
      return res.json() as Promise<NoteDetail>;
    },
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title?: string; content?: unknown; parentId?: string }) => {
      const res = await fetch("/api/v1/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: unknown; tagIds?: string[] }) => {
      const res = await fetch(`/api/v1/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", vars.id] });
    },
  });
}
```

- [ ] **Step 2: Create note list component**

Create `web/src/components/notes/note-list.tsx`:

```tsx
"use client";

import Link from "next/link";

interface NoteListProps {
  notes: {
    id: string;
    title: string;
    contentPlain: string;
    tags: { id: string; name: string; color: string }[];
    updatedAt: string;
  }[];
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return <p className="py-8 text-center text-gray-500">No notes yet. Create your first note.</p>;
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <Link
          key={note.id}
          href={`/notes/${note.id}`}
          className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <h3 className="font-medium">{note.title || "Untitled"}</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{note.contentPlain}</p>
          <div className="mt-2 flex gap-1">
            {note.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded px-2 py-0.5 text-xs"
                style={{ backgroundColor: tag.color + "20", color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create notes list page**

Create `web/src/app/(app)/notes/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useNotes, useCreateNote } from "@/hooks/use-notes";
import { NoteList } from "@/components/notes/note-list";

export default function NotesPage() {
  const router = useRouter();
  const { data, isLoading } = useNotes();
  const createNote = useCreateNote();

  async function handleCreate() {
    const result = await createNote.mutateAsync({ title: "Untitled" });
    router.push(`/notes/${result.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notes</h1>
        <button
          onClick={handleCreate}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          New Note
        </button>
      </div>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <NoteList notes={data?.data ?? []} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create note editor page**

Create `web/src/app/(app)/notes/[id]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useNote, useUpdateNote } from "@/hooks/use-notes";
import { TiptapEditor } from "@/components/editor/tiptap-editor";

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading } = useNote(id);
  const updateNote = useUpdateNote();
  const [title, setTitle] = useState("");
  const [titleLoaded, setTitleLoaded] = useState(false);

  if (!titleLoaded && note) {
    setTitle(note.title);
    setTitleLoaded(true);
  }

  const handleTitleBlur = useCallback(() => {
    if (note && title !== note.title) {
      updateNote.mutate({ id, title });
    }
  }, [id, title, note, updateNote]);

  const handleContentUpdate = useCallback(
    (content: Record<string, unknown>) => {
      updateNote.mutate({ id, content });
    },
    [id, updateNote]
  );

  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (!note) return <p className="p-6 text-red-500">Note not found</p>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="mb-4 w-full border-none bg-transparent text-3xl font-bold focus:outline-none"
        placeholder="Untitled"
      />
      <TiptapEditor
        content={note.content as Record<string, unknown>}
        onUpdate={handleContentUpdate}
        placeholder="Start writing..."
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/use-notes.ts web/src/components/notes/ web/src/app/\(app\)/notes/
git commit -m "feat: notes UI — list page, editor page with Tiptap, CRUD hooks"
```

---

## Task 18: Frontend — Journal Pages

**Files:**
- Create: `web/src/hooks/use-journal.ts`
- Create: `web/src/components/journal/mood-picker.tsx`
- Create: `web/src/app/(app)/journal/page.tsx`
- Create: `web/src/app/(app)/journal/[date]/page.tsx`

- [ ] **Step 1: Create journal hook**

Create `web/src/hooks/use-journal.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface JournalEntry {
  id: string;
  date: string;
  contentPlain: string;
  mood: number | null;
  energy: number | null;
  updatedAt: string;
}

interface JournalDetail extends JournalEntry {
  content: Record<string, unknown>;
  isSensitive: boolean;
  tags: { id: string; name: string; color: string }[];
}

export function useJournalEntries(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["journal", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.from) searchParams.set("from", params.from);
      if (params?.to) searchParams.set("to", params.to);
      const res = await fetch(`/api/v1/journal?${searchParams}`);
      return res.json() as Promise<{ data: JournalEntry[]; total: number }>;
    },
  });
}

export function useJournalEntry(date: string) {
  return useQuery({
    queryKey: ["journal", date],
    queryFn: async () => {
      const res = await fetch(`/api/v1/journal/${date}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load entry");
      return res.json() as Promise<JournalDetail>;
    },
    enabled: !!date,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { date: string; content?: unknown; mood?: number; energy?: number }) => {
      const res = await fetch("/api/v1/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal"] }),
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, ...data }: { date: string; content?: unknown; mood?: number | null; energy?: number | null }) => {
      const res = await fetch(`/api/v1/journal/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      queryClient.invalidateQueries({ queryKey: ["journal", vars.date] });
    },
  });
}
```

- [ ] **Step 2: Create mood picker**

Create `web/src/components/journal/mood-picker.tsx`:

```tsx
"use client";

const MOODS = [
  { value: 1, label: "Awful" },
  { value: 2, label: "Bad" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
];

interface MoodPickerProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

export function MoodPicker({ label, value, onChange }: MoodPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{label}:</span>
      <div className="flex gap-1">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(value === mood.value ? null : mood.value)}
            className={`rounded px-2 py-1 text-xs ${
              value === mood.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            }`}
            title={mood.label}
          >
            {mood.value}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create journal list page**

Create `web/src/app/(app)/journal/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useJournalEntries } from "@/hooks/use-journal";

export default function JournalPage() {
  const today = new Date().toISOString().split("T")[0];
  const { data, isLoading } = useJournalEntries();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journal</h1>
        <Link
          href={`/journal/${today}`}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          Today
        </Link>
      </div>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((entry) => (
            <Link
              key={entry.id}
              href={`/journal/${entry.date.split("T")[0]}`}
              className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{entry.date.split("T")[0]}</h3>
                <div className="flex gap-2 text-xs text-gray-500">
                  {entry.mood && <span>Mood: {entry.mood}/5</span>}
                  {entry.energy && <span>Energy: {entry.energy}/5</span>}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{entry.contentPlain}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create journal entry editor page**

Create `web/src/app/(app)/journal/[date]/page.tsx`:

```tsx
"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { useJournalEntry, useCreateJournalEntry, useUpdateJournalEntry } from "@/hooks/use-journal";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { MoodPicker } from "@/components/journal/mood-picker";

export default function JournalEntryPage() {
  const { date } = useParams<{ date: string }>();
  const { data: entry, isLoading } = useJournalEntry(date);
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();

  const handleContentUpdate = useCallback(
    async (content: Record<string, unknown>) => {
      if (entry) {
        updateEntry.mutate({ date, content });
      } else {
        await createEntry.mutateAsync({ date, content });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  const handleMoodChange = useCallback(
    async (mood: number | null) => {
      if (entry) {
        updateEntry.mutate({ date, mood });
      } else {
        await createEntry.mutateAsync({ date, mood });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  const handleEnergyChange = useCallback(
    async (energy: number | null) => {
      if (entry) {
        updateEntry.mutate({ date, energy });
      } else {
        await createEntry.mutateAsync({ date, energy });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">{date}</h1>
      <div className="mb-4 flex gap-4">
        <MoodPicker label="Mood" value={entry?.mood ?? null} onChange={handleMoodChange} />
        <MoodPicker label="Energy" value={entry?.energy ?? null} onChange={handleEnergyChange} />
      </div>
      <TiptapEditor
        content={(entry?.content as Record<string, unknown>) ?? { type: "doc", content: [] }}
        onUpdate={handleContentUpdate}
        placeholder="How was your day?"
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/use-journal.ts web/src/components/journal/ web/src/app/\(app\)/journal/
git commit -m "feat: journal UI — entry list, date-based editor with mood/energy pickers"
```

---

## Task 19: Frontend — Search & AI Chat

**Files:**
- Create: `web/src/hooks/use-search.ts`
- Create: `web/src/hooks/use-ai-chat.ts`
- Create: `web/src/components/search/search-results.tsx`
- Create: `web/src/components/ai/chat-panel.tsx`
- Create: `web/src/components/ai/chat-message.tsx`
- Create: `web/src/app/(app)/search/page.tsx`
- Create: `web/src/app/(app)/ai/page.tsx`
- Create: `web/src/components/layout/command-palette.tsx`

- [ ] **Step 1: Create search hook and results component**

Create `web/src/hooks/use-search.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";

interface SearchResult {
  id: string;
  type: "note" | "journal_entry";
  title: string;
  snippet: string;
  rank: number;
}

export function useSearch(query: string, mode = "combined") {
  return useQuery({
    queryKey: ["search", query, mode],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/search?q=${encodeURIComponent(query)}&mode=${mode}`
      );
      return res.json() as Promise<{ data: SearchResult[] }>;
    },
    enabled: query.length >= 2,
  });
}
```

Create `web/src/components/search/search-results.tsx`:

```tsx
"use client";

import Link from "next/link";

interface SearchResult {
  id: string;
  type: "note" | "journal_entry";
  title: string;
  snippet: string;
  rank: number;
}

export function SearchResults({ results }: { results: SearchResult[] }) {
  if (results.length === 0) {
    return <p className="py-4 text-center text-gray-500">No results found.</p>;
  }

  return (
    <div className="space-y-2">
      {results.map((r) => {
        const href = r.type === "note" ? `/notes/${r.id}` : `/journal/${r.title}`;
        return (
          <Link
            key={`${r.type}-${r.id}`}
            href={href}
            className="block rounded border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {r.type === "note" ? "Note" : "Journal"}
              </span>
              <span className="font-medium">{r.title || "Untitled"}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{r.snippet}</p>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create AI chat hook and components**

Create `web/src/hooks/use-ai-chat.ts`:

```typescript
import { useState, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (query: string, routingChoice = "local") => {
    const userMsg: ChatMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, routingChoice }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.answer ?? data.error ?? "No response",
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to get a response. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
```

Create `web/src/components/ai/chat-message.tsx`:

```tsx
import Link from "next/link";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  return (
    <div className={`mb-4 ${role === "user" ? "text-right" : ""}`}>
      <div
        className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
          role === "user"
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {sources.map((s) => {
            const href = s.type === "note" ? `/notes/${s.id}` : `/journal/${s.title}`;
            return (
              <Link
                key={`${s.type}-${s.id}`}
                href={href}
                className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300"
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
```

Create `web/src/components/ai/chat-panel.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
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
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-400">Ask anything about your notes and journal.</p>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
        {isLoading && (
          <div className="text-sm text-gray-400">Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your second brain..."
            className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create search and AI pages**

Create `web/src/app/(app)/search/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSearch } from "@/hooks/use-search";
import { SearchResults } from "@/components/search/search-results";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("combined");
  const { data, isLoading } = useSearch(query, mode);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Search</h1>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your knowledge base..."
          className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="combined">Combined</option>
          <option value="fulltext">Full-text</option>
          <option value="semantic">Semantic</option>
        </select>
      </div>
      {isLoading && <p className="text-gray-500">Searching...</p>}
      {data && <SearchResults results={data.data} />}
    </div>
  );
}
```

Create `web/src/app/(app)/ai/page.tsx`:

```tsx
import { ChatPanel } from "@/components/ai/chat-panel";

export default function AIPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <p className="text-sm text-gray-500">Ask questions about your notes and journal</p>
      </div>
      <div className="flex-1">
        <ChatPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create command palette (Cmd+K)**

Create `web/src/components/layout/command-palette.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/use-search";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { data } = useSearch(query);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!open) return null;

  function handleSelect(result: { type: string; id: string; title: string }) {
    setOpen(false);
    setQuery("");
    if (result.type === "note") {
      router.push(`/notes/${result.id}`);
    } else {
      router.push(`/journal/${result.title}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or type + to create..."
          className="w-full rounded-t-lg border-b px-4 py-3 focus:outline-none dark:bg-gray-800 dark:text-white"
        />
        <div className="max-h-80 overflow-y-auto">
          {(data?.data ?? []).map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span className="text-xs text-gray-400">{r.type === "note" ? "Note" : "Journal"}</span>
              <p className="text-sm">{r.title || "Untitled"}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire command palette into app layout**

Update `web/src/app/(app)/layout.tsx` to include the command palette:

```tsx
import { CommandPalette } from "@/components/layout/command-palette";

// Add inside the return, after <Sidebar />:
<CommandPalette />
```

- [ ] **Step 6: Commit**

```bash
git add web/src/hooks/ web/src/components/search/ web/src/components/ai/ \
  web/src/components/layout/command-palette.tsx web/src/app/\(app\)/
git commit -m "feat: search page, AI chat page, command palette (Cmd+K) — full frontend for Tier 1"
```

---

## Task 20: Frontend — TanStack Query Provider & Theme

**Files:**
- Create: `web/src/components/providers.tsx`
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Create providers wrapper**

Create `web/src/components/providers.tsx`:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [theme]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Update root layout**

Update `web/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Your personal knowledge OS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/providers.tsx web/src/app/layout.tsx
git commit -m "feat: providers — TanStack Query, NextAuth session, theme management"
```

---

## Task 21: Web Clipper API

**Files:**
- Create: `web/src/app/api/v1/clip/route.ts`

- [ ] **Step 1: Create clip endpoint**

Create `web/src/app/api/v1/clip/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { enqueueAIJob } from "@/lib/queue";
import { success, badRequest, unauthorized } from "@/lib/api-response";

const clipSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  content: z.string().optional(),
  isSensitive: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return unauthorized();
  }

  const body = await req.json();
  const parsed = clipSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten());
  }

  const { url, title, content, isSensitive } = parsed.data;
  const noteTitle = title || url;
  const plainText = content || "";

  const tiptapContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: `Source: ${url}` }],
      },
      ...(plainText
        ? plainText.split("\n").filter(Boolean).map((line) => ({
            type: "paragraph",
            content: [{ type: "text", text: line }],
          }))
        : []),
    ],
  };

  const note = await db.note.create({
    data: {
      userId: user.id!,
      title: noteTitle,
      content: tiptapContent,
      contentPlain: `Source: ${url}\n${plainText}`,
      isSensitive,
    },
  });

  if (plainText.length > 0) {
    await enqueueAIJob(user.id!, "note", note.id, "embed", {
      text: `${noteTitle}\n${plainText}`,
      is_sensitive: isSensitive,
    });
  }

  return success(note, 201);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/api/v1/clip/
git commit -m "feat: web clipper API — save URLs as notes with auto-embedding"
```

---

## Task 22: Docker Worker & Final Wiring

**Files:**
- Modify: `docker-compose.yml`
- Modify: `ai-sidecar/src/main.py`

- [ ] **Step 1: Add worker service to docker-compose**

Add to `docker-compose.yml`:

```yaml
  ai-worker:
    build:
      context: ./ai-sidecar
      dockerfile: Dockerfile
    command: python -m src.worker
    environment:
      DATABASE_URL: postgresql://brain:brain@postgres:5432/secondbrain
      REDIS_URL: redis://redis:6379
      OLLAMA_BASE_URL: http://host.docker.internal:11434
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      AI_ROUTING_MODE: ${AI_ROUTING_MODE:-hybrid}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

- [ ] **Step 2: Ensure all sidecar routes are registered**

Final `ai-sidecar/src/main.py`:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from db import get_pool, close_pool
from routes.embed import router as embed_router
from routes.auto_tag import router as auto_tag_router
from routes.summarize import router as summarize_router
from routes.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="Second Brain AI Sidecar", lifespan=lifespan)

app.include_router(embed_router)
app.include_router(auto_tag_router)
app.include_router(summarize_router)
app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Test full stack**

Run: `docker-compose up --build`
Expected: All services start — web (3000), ai-sidecar (8000), ai-worker, postgres, redis, minio.

Run: `curl http://localhost:3000` — Next.js responds.
Run: `curl http://localhost:8000/health` — returns `{"status":"ok"}`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml ai-sidecar/src/main.py
git commit -m "feat: add AI worker service to Docker Compose, final sidecar route wiring"
```

---

## Task 23: Vitest Configuration

**Files:**
- Create: `web/vitest.config.ts`

- [ ] **Step 1: Create vitest config**

Create `web/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Run all tests**

Run: `cd web && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add web/vitest.config.ts
git commit -m "chore: vitest configuration with path aliases"
```

---

## Task 24: Frontend — Note Graph View

**Files:**
- Create: `web/src/components/notes/note-graph.tsx`
- Modify: `web/src/app/(app)/notes/page.tsx`

- [ ] **Step 1: Create note graph component**

Create `web/src/components/notes/note-graph.tsx`:

```tsx
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
} from "reactflow";
import "reactflow/dist/style.css";
import { useQuery } from "@tanstack/react-query";

export function NoteGraph() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["notes-graph"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notes/graph");
      return res.json() as Promise<{
        nodes: { id: string; label: string }[];
        edges: { source: string; target: string }[];
      }>;
    },
  });

  const initialNodes: Node[] = (data?.nodes ?? []).map((n, i) => ({
    id: n.id,
    data: { label: n.label },
    position: {
      x: Math.cos((2 * Math.PI * i) / (data?.nodes.length ?? 1)) * 300 + 400,
      y: Math.sin((2 * Math.PI * i) / (data?.nodes.length ?? 1)) * 300 + 300,
    },
    style: {
      background: "#6366f1",
      color: "white",
      border: "none",
      borderRadius: "8px",
      padding: "8px 12px",
      fontSize: "12px",
    },
  }));

  const initialEdges: Edge[] = (data?.edges ?? []).map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: "#6366f1" },
  }));

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      router.push(`/notes/${node.id}`);
    },
    [router]
  );

  if (isLoading) return <p className="p-4 text-gray-500">Loading graph...</p>;
  if (!data?.nodes.length) return <p className="p-4 text-gray-500">No linked notes yet.</p>;

  return (
    <div className="h-[500px] w-full rounded border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 2: Add graph toggle to notes page**

Update `web/src/app/(app)/notes/page.tsx` — add a "Graph" toggle button and conditionally render `<NoteGraph />` or `<NoteList />`:

```tsx
import { NoteGraph } from "@/components/notes/note-graph";

// Add state:
const [view, setView] = useState<"list" | "graph">("list");

// Add toggle buttons next to "New Note":
<div className="flex gap-2">
  <button
    onClick={() => setView("list")}
    className={`rounded px-3 py-1 text-sm ${view === "list" ? "bg-gray-200 dark:bg-gray-700" : ""}`}
  >
    List
  </button>
  <button
    onClick={() => setView("graph")}
    className={`rounded px-3 py-1 text-sm ${view === "graph" ? "bg-gray-200 dark:bg-gray-700" : ""}`}
  >
    Graph
  </button>
</div>

// In the render body:
{view === "graph" ? <NoteGraph /> : <NoteList notes={data?.data ?? []} />}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/notes/note-graph.tsx web/src/app/\(app\)/notes/page.tsx
git commit -m "feat: note graph view — React Flow visualization of bidirectional links"
```

---

## Deferred to polish (not blocking MVP)

These spec items are intentionally deferred from this plan. They can be added as follow-up tasks without impacting core functionality:

- **Note tree view** — hierarchical sidebar tree using `parentId`. The flat list + graph cover the MVP. Tree can be added to the sidebar later.
- **Journal templated prompts** — configurable per-day-of-week prompts. Journal works without them. Can be added as a settings feature.
- **Saved searches** — bookmarking frequent search queries. Cmd+K covers the quick access need for now.

---

## Summary

**24 tasks, ~90 steps** covering the full Tier 1 MVP:

| Area | Tasks | What's Built |
|------|-------|-------------|
| Infrastructure | 1-2 | Docker Compose, Prisma schema, pgvector |
| Auth | 3 | NextAuth v5, register/login |
| Notes API | 4-6 | CRUD, bidirectional links, graph, tags |
| Journal API | 7 | CRUD, streaks |
| Search | 8, 11 | Full-text + semantic search |
| AI Sidecar | 9-10, 12-13 | Embeddings, auto-tag, summarize, RAG chat |
| Import | 14 | Markdown import |
| Frontend | 15-20, 24 | Shell, editor, notes, journal, search, AI chat, Cmd+K, graph |
| Extras | 21-23 | Web clipper, worker, test config |

After completing this plan, you'll have a functional Second Brain with:
- Rich text notes with bidirectional `[[wiki-links]]`
- Daily journal with mood/energy tracking
- Combined full-text + semantic search
- AI chat that answers questions from your knowledge base
- Sensitivity-aware routing (local vs cloud AI)
- Markdown import to seed existing knowledge
- Command palette for quick navigation
- Note graph visualization
