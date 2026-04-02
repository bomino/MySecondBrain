# Second Brain — User Guide

A personal knowledge OS for notes, journal, and AI-assisted thinking. This guide covers day-to-day use.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Notes](#2-notes)
3. [Journal](#3-journal)
4. [Search](#4-search)
5. [AI Features](#5-ai-features)
6. [Importing Data](#6-importing-data)
7. [Web Clipper](#7-web-clipper)
8. [Keyboard Shortcuts](#8-keyboard-shortcuts)
9. [Configuration](#9-configuration)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Quick Start

### Start the stack

```bash
docker-compose up
```

The web UI is available at `http://localhost:3001`. The AI sidecar runs at `http://localhost:8000`.

All services (PostgreSQL, Redis, MinIO, AI sidecar) start together. Wait for the health check to pass before navigating to the UI — the terminal will show each service as healthy.

### Register your account

Open `http://localhost:3001`. You'll be redirected to the register page on first visit. Fill in your email and password. This is a single-user system — there is no invite flow and no sharing.

After registration you are logged in and land on the notes list.

### Create your first note

1. Click **New Note** in the sidebar, or press `Ctrl+K` (Mac: `Cmd+K`) to open the command palette and type `+note`.
2. Give the note a title.
3. Start writing. The editor supports full markdown syntax.
4. The note saves automatically as you type.

### Create your first journal entry

1. Click **Journal** in the sidebar.
2. Click **Today** or navigate to today's date.
3. Write your entry.
4. Optionally set mood (1–5) and energy (1–5) using the controls at the top of the entry.

Journal entries are marked sensitive by default — they are processed by the local AI (Ollama) only and never sent to cloud APIs.

---

## 2. Notes

### Creating and editing

Notes live at `/notes`. To create one:

- Click **New Note** in the sidebar
- Press `Ctrl+K` / `Cmd+K` and type `+note`

The editor (Tiptap/ProseMirror) supports:

- Standard markdown: `**bold**`, `_italic_`, `# headings`, `- lists`, `` `code` ``
- Fenced code blocks with syntax highlighting (use ` ``` ` followed by a language name)
- Block quotes, horizontal rules, tables

Changes are auto-saved. There is no manual save action.

### Folders and hierarchy

Notes can be nested inside other notes to create a folder-like structure. A note can have both content and child notes — there is no separate folder entity.

To nest a note under another:
- Open the note you want to move
- Use the **Move to** option in the note's context menu (three-dot menu in the header)
- Select the parent note

The sidebar shows the tree. Collapse or expand branches by clicking the arrow next to any note that has children.

### Tags

Tags are shared across notes and journal entries. To add a tag to a note:
- Open the note
- Click the tag input area in the note header
- Type a tag name and press Enter (creates it if new)
- Existing tags are suggested as you type

Tags are colored. To change a tag's color or rename it, go to the tag management page from the sidebar's **Tags** section.

To remove a tag from a note, click the `×` on the tag chip in the note header.

### Wiki-links (bidirectional linking)

Type `[[` anywhere in the editor to open the link picker. Type to filter notes by title. Select a note to insert a `[[Note Title]]` link.

When a wiki-link is saved, the system automatically records both the outbound link (from this note) and the backlink (on the target note). Both sides of the connection are maintained without any manual action.

To view what links to a given note, open the note and click the **Backlinks** panel in the sidebar. This shows every note that has linked to the current one.

### Graph view

The graph visualizes all notes and the connections between them. Open it from the **Graph** link in the sidebar.

- Nodes are notes. Node size reflects how many connections a note has.
- Edges are wiki-links. Hover a node to highlight its direct connections.
- Click a node to navigate to that note.
- Use scroll to zoom, drag to pan.

### Sensitivity flag

Notes are **non-sensitive by default**. This means AI features (summarization, auto-tagging, semantic search, chat) can use the cloud AI (Claude) for better quality results.

To mark a note as sensitive:
- Open the note
- Toggle **Sensitive** in the note header

Sensitive notes are processed by the local AI (Ollama) only. Mark a note sensitive when it contains personal health information, financial details, private communications, or anything you don't want leaving your machine.

---

## 3. Journal

### Daily entries

Each date has exactly one journal entry. Navigate to a date from the journal calendar view:

- Click **Journal** in the sidebar
- Click any date on the calendar to open or create that day's entry
- Click **Today** to jump to the current date

The entry editor is the same Tiptap editor used for notes.

### Mood and energy tracking

At the top of each journal entry there are two 1–5 scale inputs:

- **Mood** — your emotional state (1 = very low, 5 = very high)
- **Energy** — your physical/mental energy level (1 = exhausted, 5 = energized)

Both fields are optional. Leave them blank if you don't want to track them for a given day.

Over time, the values build a dataset you can reflect on. Mood and energy data is included in journal-specific AI summaries.

### Privacy

Journal entries are **sensitive by default** (`isSensitive: true`). This is a hard default in the data model — every new journal entry starts sensitive unless you explicitly toggle it off.

What this means in practice:
- Journal entries are never sent to Claude or any cloud API
- All AI processing (embeddings, summarization, chat context) for journal entries runs through Ollama on your local machine
- If Ollama is not running, AI features for journal entries queue up and process when Ollama comes back online

To make a specific entry non-sensitive (for example, a public reflection you don't mind cloud processing), toggle **Sensitive** off in the entry header. Do this deliberately — the default exists to protect your private thoughts.

### Journal streaks

The journal section shows a streak counter: how many consecutive days you've written an entry. The `/api/v1/journal/streaks` endpoint provides the raw stats if you want to build on them.

---

## 4. Search

### Full-text search

The search page (`/search`) and the command palette both support full-text search across all notes and journal entries. Full-text search uses PostgreSQL's `tsvector` index — it matches exact words and their stems.

Type your query in the search bar and press Enter. Results show title, a snippet of matching content, and tags.

### Semantic search

Semantic search finds content by meaning rather than exact keywords. A query like "things I was anxious about" will surface relevant journal entries even if the word "anxious" doesn't appear verbatim.

To use semantic search:
- On the search page, toggle **Semantic** mode
- Or append `?mode=semantic` to the search URL

Semantic search requires embeddings to have been generated for your content. New or recently edited content shows a "AI index updating" badge in results until embedding is complete (typically within a few minutes of saving).

### Combined mode

The default search mode combines full-text and semantic ranking. This is the recommended mode for most queries — it surfaces exact matches while also catching semantically related content.

Switch modes using the toggle on the search page:
- **Full-text** — exact word matching, fastest
- **Semantic** — meaning-based, requires embeddings
- **Combined** — both signals merged (default)

### Command palette

Press `Ctrl+K` (Mac: `Cmd+K`) from anywhere in the app to open the command palette.

The palette is the fastest way to navigate and create. See [Keyboard Shortcuts](#8-keyboard-shortcuts) for the full list of palette commands.

---

## 5. AI Features

### How sensitivity routing works

Every piece of content has an `isSensitive` flag. Before any AI operation, the API checks this flag and routes accordingly:

| Content | Default | Routed to |
|---------|---------|-----------|
| Notes | Non-sensitive | Claude (cloud) |
| Journal entries | Sensitive | Ollama (local) |
| Web clips | Non-sensitive | Claude (cloud) |
| Imported markdown | Non-sensitive | Claude (cloud) |

You can override per-item using the Sensitive toggle on notes or journal entries.

The global routing mode (`AI_ROUTING_MODE` environment variable) can force all traffic to one destination:
- `hybrid` — default, routes by `isSensitive` flag
- `local` — all AI operations use Ollama regardless of sensitivity
- `cloud` — all AI operations use Claude (not recommended if you have private content)

### Chat with your knowledge base

The AI Chat panel is accessible from the sidebar or by clicking the chat icon. It slides in from the right and can be expanded to full page.

Type a question in natural language. The system:

1. Embeds your question
2. Retrieves the most semantically similar chunks from your notes and journal entries
3. Checks whether the retrieved content contains any sensitive items

If the retrieved context is entirely non-sensitive, the answer is generated using Claude.

If the context includes sensitive content, you are shown a choice before the answer is generated:

> **This question found both sensitive and non-sensitive results.**
> - **Process locally** — uses all results including sensitive content, runs on Ollama (slower, less capable)
> - **Exclude sensitive results** — uses cloud model (Claude), faster, but omits sensitive content from context

The default is **Process locally** (privacy-first). Choose **Exclude sensitive results** if you want a higher-quality answer and are comfortable with the context being sent to Claude.

Answers include source citations — links back to the specific notes or journal entries that contributed to the answer. Click any citation to navigate to the source.

If you are viewing a specific note when you open the chat panel, that note is included as additional context automatically.

### Summarization

To summarize a note or journal entry:
- Open the note or journal entry
- Click **Summarize** in the note header (the sparkle icon)

Summarization routes by the item's `isSensitive` flag. If the content is sensitive and Ollama is not running, you'll see an error: "Sensitive content requires local AI processing, but the local model is unavailable."

The summary is displayed inline below the editor. It is not saved as part of the content.

Summarization works on notes and journal entries (`note` and `journal_entry` types). Long content (over ~500 words) benefits most.

### Auto-tagging

When you save a note or journal entry, the system asynchronously:

1. Generates an embedding for the content
2. Suggests tags based on the content

Tag suggestions appear as chips in the note header with an **Accept** / **Dismiss** action on each. You can also accept all suggestions at once.

Auto-tagging runs via the background job queue (Redis). On a busy machine it may take a few minutes after saving before suggestions appear. If Ollama is not running, auto-tagging for sensitive items queues until Ollama is available.

To review all pending tag suggestions across all content, go to **AI** > **Suggestions** in the sidebar.

### Embeddings and the AI index

Every piece of content is embedded asynchronously after saving. The embedding is used for semantic search and RAG chat.

Embedding is debounced: if you keep editing, the system waits until you stop for 5 minutes before re-embedding. This avoids unnecessary processing during active writing.

Long content is chunked (approximately 500 tokens per chunk, 50 token overlap) so specific paragraphs can be retrieved by semantic search rather than relying on a single vector for the whole document.

Content with a stale or pending embedding shows an "AI index updating" indicator in search results. This is normal and resolves automatically.

### Local model requirements

For local AI processing (sensitive content), Ollama must be running with these models pulled:

```bash
ollama pull nomic-embed-text   # ~500MB — embeddings
ollama pull llama3             # ~4.7GB — chat and summarization
```

Total: approximately 6GB of RAM/VRAM for simultaneous operation. If your machine doesn't have enough memory, run only the embedding model and accept degraded chat quality.

If Ollama is not running, non-sensitive content continues processing via Claude. Sensitive content queues and processes when Ollama comes back online. The app shows an in-app notification when sensitive processing is delayed.

---

## 6. Importing Data

### Markdown import

Use markdown import to seed your knowledge base from Obsidian, Notion exports, Bear, or any other tool that exports `.md` files.

**Supported file types:** `.md`, `.markdown`, `.txt`

**Single file:**

```bash
curl -X POST http://localhost:3001/api/v1/import/markdown \
  -H "Cookie: <your-session-cookie>" \
  -F "files=@my-note.md"
```

**Multiple files (zip archive):**

```bash
curl -X POST http://localhost:3001/api/v1/import/markdown \
  -H "Cookie: <your-session-cookie>" \
  -F "files=@export.zip"
```

**Multiple files individually:**

```bash
curl -X POST http://localhost:3001/api/v1/import/markdown \
  -H "Cookie: <your-session-cookie>" \
  -F "files=@note1.md" \
  -F "files=@note2.md"
```

The import endpoint returns a `jobId`. Use it to check progress:

```bash
curl http://localhost:3001/api/v1/import/status/<jobId> \
  -H "Cookie: <your-session-cookie>"
```

The status response includes counts of processed, failed, and pending files.

### What happens during import

For each file:

1. The filename (without extension) becomes the note title
2. The file content is parsed as markdown and converted to Tiptap JSON
3. Plain text is extracted for full-text indexing
4. The note is saved as non-sensitive by default
5. An embedding job is queued (processes asynchronously)

Obsidian-style `[[wiki-links]]` in imported files are preserved as-is. Links will resolve to other notes if the target note exists or is imported in the same batch.

Front matter (YAML at the top of a file) is currently stripped during import. Tags defined in front matter are not automatically applied — add them manually after import, or accept the auto-tag suggestions that arrive after embedding completes.

### Importing from Obsidian

Export your Obsidian vault as a folder of `.md` files. Then either:

1. Zip the vault folder and upload as a single zip file
2. Use a script to upload files in batches:

```bash
#!/bin/bash
COOKIE="<your-session-cookie>"
find ./vault -name "*.md" | while read f; do
  curl -s -X POST http://localhost:3001/api/v1/import/markdown \
    -H "Cookie: $COOKIE" \
    -F "files=@$f" > /dev/null
  echo "Imported: $f"
done
```

After import, allow a few minutes for all embeddings to generate before relying on semantic search results.

---

## 7. Web Clipper

The web clipper saves a URL as a note. Use it to capture articles, documentation pages, or any web content you want to reference later.

### Save a URL

```bash
curl -X POST http://localhost:3001/api/v1/clip \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "url": "https://example.com/article",
    "title": "Optional custom title",
    "content": "Optional extracted text or summary",
    "isSensitive": false
  }'
```

**Fields:**

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `url` | Yes | — | The URL to save |
| `title` | No | Derived from URL | Note title |
| `content` | No | Empty | Extracted text or your own summary |
| `isSensitive` | No | `false` | Whether to restrict to local AI |

The clip is saved as a regular note and appears in the notes list. It inherits all note features: tagging, wiki-links, search, AI summarization.

### Browser bookmarklet

You can create a bookmarklet to clip pages with one click. Create a new bookmark with this URL, replacing `YOUR_SESSION_COOKIE` with your actual cookie value:

```javascript
javascript:(function(){
  fetch('http://localhost:3001/api/v1/clip',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'include',
    body:JSON.stringify({url:location.href,title:document.title})
  }).then(r=>r.json()).then(()=>alert('Clipped!')).catch(()=>alert('Clip failed'));
})();
```

Because the app runs on localhost and uses HTTP-only cookies, `credentials:'include'` handles authentication automatically when you are logged into the app in the same browser.

---

## 8. Keyboard Shortcuts

### Command palette

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `Escape` | Close command palette |
| `↑` / `↓` | Navigate results |
| `Enter` | Select item or execute action |

### Command palette quick-create prefixes

Type these prefixes in the command palette to create content instantly:

| Prefix | Action |
|--------|--------|
| `+note` | Create a new note |
| `+journal` | Open today's journal entry |

### Editor shortcuts

| Shortcut | Action |
|----------|--------|
| `[[` | Open wiki-link picker |
| `Ctrl+B` / `Cmd+B` | Bold |
| `Ctrl+I` / `Cmd+I` | Italic |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Tab` | Indent list item |
| `Shift+Tab` | Outdent list item |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Command palette (search, navigate, create) |

---

## 9. Configuration

All configuration is through environment variables in `.env` (copied from `.env.example`).

### Required variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://brain:brain@localhost:5432/secondbrain` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6380` |
| `S3_ENDPOINT` | MinIO/S3 endpoint | `http://localhost:9000` |
| `S3_ACCESS_KEY` | MinIO/S3 access key | `minioadmin` |
| `S3_SECRET_KEY` | MinIO/S3 secret key | `minioadmin` |
| `S3_BUCKET` | Storage bucket name | `secondbrain` |
| `NEXTAUTH_SECRET` | Session signing secret — change in production | `change-me-in-production` |
| `NEXTAUTH_URL` | App base URL | `http://localhost:3000` |

### AI variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_SIDECAR_URL` | Internal URL for the AI sidecar | `http://localhost:8000` |
| `ANTHROPIC_API_KEY` | Claude API key for cloud AI | (empty — cloud AI disabled if unset) |
| `OLLAMA_BASE_URL` | Ollama base URL for local AI | `http://localhost:11434` |
| `AI_ROUTING_MODE` | Global AI routing mode | `hybrid` |

### AI routing modes

| Mode | Behavior |
|------|----------|
| `hybrid` | Routes by `isSensitive` flag. Sensitive → Ollama. Non-sensitive → Claude. This is the default. |
| `local` | All AI operations use Ollama, regardless of sensitivity. Use this if you have no Claude API key or want full local operation. |
| `cloud` | All AI operations use Claude. Sensitive flags are ignored. Only use this if you have no private content. |

### Setting up Ollama

If you are running Ollama outside of Docker (on the host machine), set:

```
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

If Ollama is running inside Docker Compose, use the service name:

```
OLLAMA_BASE_URL=http://ollama:11434
```

Pull the required models before starting the stack:

```bash
ollama pull nomic-embed-text
ollama pull llama3
```

### Running without a Claude API key

Set `AI_ROUTING_MODE=local` and leave `ANTHROPIC_API_KEY` empty. All AI features work through Ollama. Expect slower responses and lower quality for complex queries.

### Running without Ollama

Set `AI_ROUTING_MODE=cloud` and provide `ANTHROPIC_API_KEY`. All AI features use Claude. Sensitive items are still marked in the database, but the cloud routing restriction is not enforced in this mode — use it only if you have no private content.

---

## 10. Troubleshooting

### App is not accessible at localhost:3001

Check that Docker Compose started cleanly:

```bash
docker-compose ps
```

All services should show `Up` or `healthy`. If a service is in `Exit` state, check its logs:

```bash
docker-compose logs next-app
docker-compose logs ai-sidecar
docker-compose logs postgres
```

The most common cause is a port conflict. If port 3001 is in use, change the port mapping in `docker-compose.yml`.

### "AI index updating" appears on all search results

Embeddings generate asynchronously. If they are all stuck, check:

1. Is the AI sidecar running? `docker-compose ps ai-sidecar`
2. Is Redis running? The job queue requires Redis. `docker-compose ps redis`
3. Check sidecar logs for errors: `docker-compose logs ai-sidecar`

For non-sensitive content, also verify `ANTHROPIC_API_KEY` is set if you are using `hybrid` or `cloud` routing.

### Sensitive content AI features are unavailable

You'll see: "Sensitive content requires local AI processing, but the local model is unavailable."

This means Ollama is not reachable. Check:

1. Is Ollama running on your machine? `ollama list` should show installed models.
2. Is `OLLAMA_BASE_URL` pointing to the correct address?
3. Are the required models pulled?

```bash
ollama pull nomic-embed-text
ollama pull llama3
```

If running Ollama on the host and the app in Docker, use `http://host.docker.internal:11434` as the `OLLAMA_BASE_URL`.

### Chat returns empty or poor answers

Possible causes:

- **Embeddings not generated yet** — wait a few minutes after creating notes, then retry.
- **No content in the knowledge base** — the RAG pipeline retrieves from your notes and journal. If you have few entries, results will be sparse.
- **Sensitive content, Ollama unavailable** — sensitive items cannot contribute to context without Ollama running.

### Journal entries not creating

The API enforces one entry per date. If you see a `409 CONFLICT` error, an entry already exists for that date. Navigate to the existing entry from the journal calendar view.

### Import job fails

Check the job status endpoint:

```bash
curl http://localhost:3001/api/v1/import/status/<jobId> \
  -H "Cookie: <your-session-cookie>"
```

Common reasons for import failure:

- File is not valid UTF-8 text
- File exceeds the upload size limit
- Markdown contains unsupported Tiptap syntax

Successfully parsed files in the same batch are still imported even if some fail.

### Web clipper returns 401

You are not authenticated. Make sure you are logged in at `http://localhost:3001` in the same browser session when using the bookmarklet, or include a valid session cookie in your curl command.

To get your session cookie from a logged-in browser session: open DevTools > Application > Cookies > `localhost` and copy the `next-auth.session-token` value.

### Database migration errors on startup

If the schema has changed since you last ran the stack, run migrations manually:

```bash
docker-compose exec next-app npx prisma migrate deploy
```

### Resetting the database (development only)

To wipe all data and start fresh:

```bash
docker-compose down -v          # removes volumes including DB
docker-compose up               # recreates and migrates
```

This is destructive and cannot be undone. Do not run this if you have notes you want to keep.
