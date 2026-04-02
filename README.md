# Second Brain

A personal knowledge OS — notes, journal, and AI-powered thinking, all in one place.

## What It Does

- **Notes** with bidirectional `[[wiki-links]]`, graph visualization, and folder hierarchy
- **Journal** with mood/energy tracking, calendar heatmap, and streaks
- **AI Chat** — ask questions about your notes and journal (RAG with source citations)
- **Semantic Search** — find content by meaning, not just keywords
- **Auto-tagging & Summarization** — AI-powered content organization
- **Sensitivity-aware** — sensitive data stays local (Ollama), non-sensitive uses cloud AI (Claude)

## Quick Start

```bash
# Clone
git clone https://github.com/bomino/MySecondBrain.git
cd MySecondBrain

# Copy environment config
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY for cloud AI features

# Start everything
docker-compose up -d

# Run database migrations
cd web && npm install && npx prisma migrate deploy && cd ..

# Open the app
open http://localhost:3001
```

Register an account at `/register`, then start creating notes.

## Features

### Core
- Rich text editor (Tiptap) with markdown support, code blocks, and wiki-links
- Bidirectional note linking with `[[double brackets]]`
- Note graph visualization (React Flow)
- Daily journal with mood (1-5) and energy (1-5) tracking
- Full-text search (PostgreSQL tsvector) + semantic search (pgvector)
- Combined search mode (best of both)

### AI
- Chat with your knowledge base — answers sourced from your notes with citations
- Auto-tagging suggestions
- Content summarization
- Sensitivity routing — `is_sensitive` flag controls local vs cloud AI processing
- Chunked embeddings (500 tokens, 50 overlap) for precise retrieval

### Organization
- Tags with custom colors (8 presets)
- Pin important notes to top
- Note templates (create from template or save as template)
- Folder hierarchy via parent notes
- Markdown import (drag-and-drop) and export

### Quality of Life
- Auto-save with debounced indicator ("Saving..."/"Saved")
- Word count in editor footer
- Backlinks panel (collapsible, shows notes linking to current note)
- Trash with restore (soft deletes)
- AI chat history (persisted conversations)
- Journal streak tracking with calendar heatmap
- Command palette (`Ctrl+K` / `Cmd+K`)
- Keyboard shortcuts (`N` notes, `J` journal, `/` search, `?` help)
- Dark/Light/System theme toggle
- Mobile responsive (hamburger menu + bottom nav)
- PWA installable
- Toast notifications on all actions

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Tiptap |
| State | TanStack Query, Zustand |
| API | Next.js API Routes (REST) |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| Cache/Queue | Redis |
| File Storage | MinIO (S3-compatible) |
| AI Sidecar | Python, FastAPI |
| AI (cloud) | Claude API (Anthropic) |
| AI (local) | Ollama (llama3, nomic-embed-text) |
| Auth | NextAuth.js v5 |
| Testing | Vitest, Playwright |

## Architecture

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Next.js    │
                    │  (API + UI)  │
                    └──┬───────┬───┘
                       │       │
              ┌────────▼──┐ ┌──▼──────────┐
              │ PostgreSQL │ │  AI Sidecar  │
              │ + pgvector │ │  (FastAPI)   │
              └────────────┘ └──┬───────┬──┘
                                │       │
                         ┌──────▼──┐ ┌──▼──────┐
                         │ Ollama  │ │ Claude  │
                         │ (local) │ │ (cloud) │
                         └─────────┘ └─────────┘
```

## Project Structure

```
├── web/                        # Next.js application
│   ├── src/
│   │   ├── app/                # Pages and API routes
│   │   ├── components/         # React components
│   │   ├── hooks/              # TanStack Query hooks
│   │   ├── lib/                # Utilities (db, auth, search, export)
│   │   └── stores/             # Zustand stores
│   ├── prisma/                 # Database schema and migrations
│   ├── e2e/                    # Playwright E2E tests
│   └── public/                 # Static assets, PWA manifest
├── ai-sidecar/                 # Python AI service
│   ├── src/
│   │   ├── routes/             # FastAPI endpoints
│   │   ├── services/           # Business logic (embedding, RAG, LLM)
│   │   └── worker.py           # Redis job consumer
│   └── tests/
├── docker-compose.yml          # Full stack orchestration
└── docs/                       # Specs, plans, user guide
```

## Development

```bash
# Install dependencies
cd web && npm install

# Run locally (needs Docker services for DB/Redis)
docker-compose up -d postgres redis minio
cd web && npm run dev

# Run tests
cd web && npm run test:run          # Unit tests (Vitest)
cd web && npx playwright test       # E2E tests (needs app running)

# Database
cd web && npx prisma migrate dev    # Create/apply migrations
cd web && npx prisma studio         # Visual DB browser
```

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Session encryption key |
| `ANTHROPIC_API_KEY` | For cloud AI | Claude API key |
| `AI_ROUTING_MODE` | No | `hybrid` (default), `local`, or `cloud` |
| `OLLAMA_BASE_URL` | For local AI | Ollama server URL |

## Documentation

- **[User Guide](docs/USER_GUIDE.md)** — day-to-day usage, feature reference
- **[Design Spec](docs/superpowers/specs/2026-04-01-second-brain-design.md)** — architecture decisions

## License

Private project.
