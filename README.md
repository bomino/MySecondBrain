# Second Brain

A personal knowledge OS — notes, journal, and AI-powered thinking, all in one place.

## What It Does

- **Notes** with bidirectional `[[wiki-links]]`, graph visualization, and folder hierarchy
- **Journal** with mood/energy tracking, calendar heatmap, and streaks
- **AI Chat** — ask questions about your notes and journal (RAG with source citations)
- **Semantic Search** — find content by meaning, not just keywords
- **Auto-tagging & Summarization** — AI-powered content organization
- **AI Writing Assistant** — select text, transform it inline (improve, simplify, expand, summarize)
- **Daily Digest** — daily relevance briefing: forgotten notes, on-this-day, orphans, clusters
- **Related Notes** — semantically similar and title-matched notes shown per note
- **Sensitivity-aware** — sensitive data stays local (Ollama), non-sensitive uses cloud AI (Claude)

## Quick Start

```bash
# Clone
git clone https://github.com/bomino/MySecondBrain.git
cd MySecondBrain

# Copy environment config
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY for cloud AI features

# Pull required Ollama models (needed for embeddings and local AI)
ollama pull nomic-embed-text   # required — powers semantic search and RAG
ollama pull llama3.1:8b        # default local chat model

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

### AI Intelligence
- Chat with your knowledge base — answers sourced from your notes with citations
- Auto-tagging suggestions — amber banner appears after save, accept or dismiss per tag
- Content summarization — one-click sparkle icon on any note or journal entry
- **AI Writing Assistant** — select text in editor → floating menu → Improve / Simplify / Expand / Summarize; replaces selection with result
- **Daily Digest** (`/digest`) — four heuristics: Forgotten Relevance (30+ day old notes similar to recent work), On This Day (journal entries from same date in prior years), Orphan Detection (untagged+unlinked notes >14 days old), Cluster Alerts (3+ recent notes that semantically cluster but aren't linked)
- **Related Notes panel** — per-note panel with Semantically Similar (pgvector cosine) and Mentioned in this note (title substring match) sections
- **AI Status Indicator** — colored dot next to AI Chat in sidebar: green (ready), amber (processing), red (unavailable)
- **OpenAI-compatible provider** — switch cloud AI to any OpenAI API-compatible service (OpenAI, Groq, Together AI, Mistral, vLLM, and more) from Settings without restarting the stack
- Sensitivity routing — `is_sensitive` flag controls local (Ollama) vs cloud (Claude/OpenAI-compatible) AI processing
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
- Trash with restore (soft deletes), Empty Trash button, and per-item permanent delete
- **Data export** — download full knowledge base as JSON from `/export` (notes, journal, tags, links, templates)
- AI chat history (persisted conversations) with per-conversation delete (trash icon) and **Clear All** bulk delete
- Journal streak tracking with calendar heatmap
- Command palette (`Ctrl+K` / `Cmd+K`)
- Keyboard shortcuts (`N` notes, `J` journal, `/` search, `?` help)
- Dark/Light/System theme toggle
- **Editor preferences** — font size (12–22 px) and line spacing (1.2–2.2) sliders, persisted to localStorage
- **Profile management** — change email (uniqueness checked) and password from Settings
- **Preference toggles** — auto-tag, auto-apply tags, default sensitivity, toast notifications, default search mode
- Local timezone formatting for all dates and times
- Custom Agadez cross logo in sidebar, login/register pages, favicon, and PWA manifest
- Sidebar shows actual user email and initial (not hardcoded)
- Logout button in sidebar user section
- Mobile responsive (hamburger menu + bottom nav)
- PWA installable
- Toast notifications on all actions (configurable)

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
| AI (local) | Ollama (llama3.1:8b, nomic-embed-text) |
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
| `NEXTAUTH_SECRET` | Yes | Session encryption key — **must be changed from default in production** |
| `NEXTAUTH_URL` | Yes | App base URL (e.g., `https://brain.example.com`) |
| `ANTHROPIC_API_KEY` | For Anthropic cloud AI | Claude API key |
| `AI_ROUTING_MODE` | No | `hybrid` (default), `local`, or `cloud` |
| `OLLAMA_BASE_URL` | For local AI | Ollama server URL |

OpenAI-compatible provider credentials (base URL, API key, model) are configured per-user in **Settings → AI Configuration** and stored in the database — no env vars needed.

## Deployment

Second Brain is designed for **self-hosting** via Docker Compose. It requires Node.js, PostgreSQL, Redis, and MinIO — it cannot run on GitHub Pages or static hosting.

**Recommended:** Hetzner CPX31 (~$8/month) — 4 vCPUs, 8 GB RAM, 160 GB SSD. Enough for the full stack plus Ollama running `llama3.1:8b` for local AI.

**Quick deploy on a VPS:**

```bash
# 1. Install Docker + Docker Compose on the VPS
# 2. Clone and configure
git clone https://github.com/bomino/MySecondBrain.git
cd MySecondBrain
cp .env.example .env
# Set NEXTAUTH_SECRET (generate with: openssl rand -hex 32)
# Set NEXTAUTH_URL to your domain
# Add ANTHROPIC_API_KEY or configure OpenAI-compatible provider in Settings

# 3. Start the stack
docker-compose up -d

# 4. Run migrations
docker-compose exec next-app npx prisma migrate deploy
```

Put nginx or Caddy in front of port 3001 for TLS. See the [User Guide → Deployment](docs/USER_GUIDE.md#13-deployment) section for full instructions.

## Documentation

- **[User Guide](docs/USER_GUIDE.md)** — day-to-day usage, feature reference
- **[Design Spec](docs/superpowers/specs/2026-04-01-second-brain-design.md)** — architecture decisions

## License

Private project.
