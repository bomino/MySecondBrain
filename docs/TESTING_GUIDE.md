# Second Brain — Testing Guide

A manual QA and end-to-end verification guide covering every feature area of the Second Brain application. Each section contains numbered test scenarios with precise steps, expected results, and clear pass criteria.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentication](#1-authentication)
3. [Notes CRUD](#2-notes-crud)
4. [Note Features](#3-note-features)
5. [Note Templates](#4-note-templates)
6. [Journal](#5-journal)
7. [Search](#6-search)
8. [AI Chat](#7-ai-chat)
9. [AI Writing Assistant](#8-ai-writing-assistant)
10. [Auto-tagging](#9-auto-tagging)
11. [Daily Digest](#10-daily-digest)
12. [Tags](#11-tags)
13. [Import](#12-import)
14. [Export](#13-export)
15. [Trash](#14-trash)
16. [Settings](#15-settings)
17. [Theme](#16-theme)
18. [Mobile Responsive](#17-mobile-responsive)
19. [Keyboard Shortcuts](#18-keyboard-shortcuts)
20. [PWA](#19-pwa)
21. [AI Status Indicator](#20-ai-status-indicator)
22. [API Tests (curl)](#api-tests-curl)
23. [Automated Tests](#automated-tests)

---

## Prerequisites

### Starting the Application

**Full stack (recommended):**
```bash
docker-compose up -d
```

Wait until all containers report healthy in the terminal output. Then open `http://localhost:3001`.

**Infrastructure only (for local Next.js development):**
```bash
docker-compose up -d postgres redis minio
cd web && npm run dev
```

The app runs at `http://localhost:3001`. The AI sidecar runs at `http://localhost:8000` (internal — not accessible from the host browser after the security fix).

### Service Health Check

Verify all services are running before testing:
```bash
docker-compose ps
```

Expected output shows `Up` status for: `postgres`, `redis`, `minio`, `web` (Next.js), `ai-sidecar`, and `ai-worker`.

### Creating a Test Account

1. Open `http://localhost:3001` — you will be redirected to `/register`.
2. Enter any email address (e.g., `tester@example.com`) and a password of at least 8 characters.
3. Click **Create Account**.
4. You will be redirected to `/login`. Log in with the credentials you just created.
5. After login you land on `/notes`.

> For API tests, you need a session cookie. Log in via the browser and extract the `next-auth.session-token` cookie from DevTools → Application → Cookies.

### Configuring AI (Optional vs. Required)

| AI Feature | Requirement |
|------------|-------------|
| Full-text search | No AI needed |
| Auto-tagging, embeddings, semantic search | AI sidecar must be running (`docker-compose up ai-sidecar`) |
| Non-sensitive content AI | `ANTHROPIC_API_KEY` in `.env` **or** `AI_ROUTING_MODE=local` with Ollama running |
| Sensitive content AI (journal, marked notes) | Ollama running with `nomic-embed-text` and `llama3` models pulled |
| OpenAI-compatible provider | Base URL + API key configured in Settings → AI Configuration |

**Minimum setup for all AI tests:**
- Set `ANTHROPIC_API_KEY=<your-key>` in `.env` and restart: `docker-compose up -d`
- OR run Ollama locally: `ollama pull nomic-embed-text && ollama pull llama3`, then set `AI_ROUTING_MODE=local`

**Skip AI tests if:** you have no API key and no Ollama installation. Mark AI-dependent test cases as "SKIPPED — No AI configured".

---

## 1. Authentication

### AUTH-001 — Register Page Loads

**Description:** Verify the registration page renders correctly.

**Preconditions:** No active session.

**Steps:**
1. Open `http://localhost:3001/register` in a fresh incognito browser window.

**Expected Result:** Page displays a heading "Create Account", an email input, a password input, and a submit button.

**Pass Criteria:** All three form elements visible with the heading "Create Account".

---

### AUTH-002 — Successful Registration

**Description:** Register a new account and verify redirect behavior.

**Preconditions:** The email address used is not already registered.

**Steps:**
1. Navigate to `http://localhost:3001/register`.
2. Enter a unique email address (e.g., `newuser-<timestamp>@test.com`).
3. Enter a password.
4. Click **Create Account**.

**Expected Result:** Page redirects to `/login`.

**Pass Criteria:** Browser URL is `/login` after form submission.

---

### AUTH-003 — Duplicate Registration Rejected

**Description:** Attempting to register with an already-used email returns an error.

**Preconditions:** An account already exists for the email address.

**Steps:**
1. Navigate to `/register`.
2. Enter an email that is already registered.
3. Enter a password and click **Create Account**.

**Expected Result:** An error message appears on the page. The redirect to `/login` does not occur.

**Pass Criteria:** Error text visible; URL remains `/register`.

---

### AUTH-004 — Login Page Loads

**Description:** Verify the login page renders correctly.

**Preconditions:** No active session.

**Steps:**
1. Open `http://localhost:3001/login`.

**Expected Result:** Page displays a heading "Sign In", an email input, a password input, and a submit button.

**Pass Criteria:** Heading reads "Sign In"; both inputs and the button are visible.

---

### AUTH-005 — Successful Login

**Description:** Log in with valid credentials and verify redirect to notes.

**Preconditions:** An account exists for the credentials used.

**Steps:**
1. Navigate to `/login`.
2. Enter valid email and password.
3. Click **Sign In**.

**Expected Result:** Browser redirects to `/notes`.

**Pass Criteria:** URL is `/notes`; the sidebar with navigation links is visible.

---

### AUTH-006 — Invalid Credentials Rejected

**Description:** Logging in with a wrong password shows an error.

**Preconditions:** None.

**Steps:**
1. Navigate to `/login`.
2. Enter a valid email with an incorrect password.
3. Click **Sign In**.

**Expected Result:** An error message appears. No redirect occurs.

**Pass Criteria:** Error text visible; URL remains `/login`.

---

### AUTH-007 — Unauthenticated Redirect

**Description:** Accessing a protected page without a session redirects to login.

**Preconditions:** No active session (use incognito window or clear cookies).

**Steps:**
1. In a browser with no session, navigate directly to `http://localhost:3001/notes`.

**Expected Result:** Browser redirects to `/login`.

**Pass Criteria:** Final URL matches `/login` (or `/login?callbackUrl=...`).

---

### AUTH-008 — Session Persistence

**Description:** A logged-in session survives a page reload.

**Preconditions:** User is logged in.

**Steps:**
1. Log in and confirm you are on `/notes`.
2. Reload the page (`F5` or `Ctrl+R`).

**Expected Result:** Page reloads to `/notes`; user remains logged in; sidebar shows the user's email.

**Pass Criteria:** No redirect to login after reload.

---

### AUTH-009 — Logout

**Description:** Clicking Logout ends the session and redirects to login.

**Preconditions:** User is logged in.

**Steps:**
1. In the sidebar, locate the user section at the bottom.
2. Click the **Log Out** button (LogOut icon).

**Expected Result:** Session ends immediately; browser redirects to `/login`.

**Pass Criteria:** URL is `/login`; navigating to `/notes` redirects back to `/login`.

---

## 2. Notes CRUD

### NOTES-001 — Notes List Page Loads

**Description:** The notes index page loads and displays the page heading.

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to `/notes` (or click **Notes** in the sidebar).

**Expected Result:** Page shows "Notes" heading and a **New Note** button.

**Pass Criteria:** "Notes" heading visible; "New Note" dropdown button visible.

---

### NOTES-002 — Create a Blank Note

**Description:** Create a new blank note and verify the editor opens.

**Preconditions:** User is logged in and on `/notes`.

**Steps:**
1. Click **New Note** in the sidebar.
2. A dropdown appears. Click **Blank note**.

**Expected Result:** Browser navigates to a new note URL (`/notes/<id>`). The note editor opens with an empty title input showing placeholder "Untitled".

**Pass Criteria:** URL matches `/notes/<uuid>`; title input with "Untitled" placeholder is visible.

---

### NOTES-003 — Edit Note Title

**Description:** Typing in the title field saves the title.

**Preconditions:** A new blank note is open.

**Steps:**
1. Click the title input (placeholder "Untitled").
2. Type `QA Test Note`.
3. Click outside the title input (blur).
4. Wait 1 second.
5. Navigate to `/notes`.

**Expected Result:** The notes list shows a note titled "QA Test Note".

**Pass Criteria:** "QA Test Note" appears in the notes list.

---

### NOTES-004 — Edit Note Content

**Description:** Typing in the editor body saves content.

**Preconditions:** A note is open.

**Steps:**
1. Click inside the editor body area.
2. Type `This is a test paragraph.`
3. Wait 2 seconds for auto-save to complete.

**Expected Result:** The footer shows "Saving..." briefly, then "Saved".

**Pass Criteria:** Footer status changes to "Saved" within 5 seconds of stopping typing.

---

### NOTES-005 — Auto-save Indicator

**Description:** The save indicator reflects in-flight and completed save states.

**Preconditions:** A note is open.

**Steps:**
1. Begin typing content in the note body.
2. Observe the footer while typing.
3. Stop typing and observe the footer.

**Expected Result:** Footer shows "Saving..." while debounce is pending, then "Saved" once the save completes.

**Pass Criteria:** Both "Saving..." and "Saved" states are observed in sequence.

---

### NOTES-006 — Word Count Display

**Description:** The word count in the editor footer reflects the content length.

**Preconditions:** A note with content is open.

**Steps:**
1. Open a note that has at least one word of content.
2. Observe the editor footer.

**Expected Result:** The footer shows a word count (e.g., "5 words").

**Pass Criteria:** A numeric word count is visible in the footer.

---

### NOTES-007 — Delete Note (Soft Delete)

**Description:** Deleting a note moves it to Trash, not permanently removes it.

**Preconditions:** User is logged in; at least one note exists.

**Steps:**
1. Open a note.
2. Click the **Delete** button in the editor toolbar.
3. A confirmation dialog appears. Confirm the deletion.

**Expected Result:** The note disappears from the notes list and appears in `/trash`.

**Pass Criteria:** Note is absent from `/notes`; note is present in `/trash`.

---

### NOTES-008 — Delete Confirmation Dialog

**Description:** The delete action requires confirmation.

**Preconditions:** A note is open.

**Steps:**
1. Click **Delete** on an open note.

**Expected Result:** A modal dialog appears showing "Delete note" with **Confirm** and **Cancel** buttons.

**Pass Criteria:** Dialog is visible with both buttons.

---

### NOTES-009 — Cancel Delete

**Description:** Canceling the delete dialog leaves the note intact.

**Preconditions:** The delete confirmation dialog is open.

**Steps:**
1. Click **Cancel** in the delete confirmation dialog.

**Expected Result:** Dialog closes; note is unchanged; URL remains on the note.

**Pass Criteria:** Note is still accessible; it does not appear in Trash.

---

## 3. Note Features

### NOTEF-001 — Pin / Unpin a Note

**Description:** Pinning a note moves it to the top of the notes list.

**Preconditions:** At least two notes exist; user is on the notes list.

**Steps:**
1. Open a note that is currently not pinned.
2. Click the **pin icon** in the editor toolbar to pin it.
3. Navigate to `/notes`.

**Expected Result:** The pinned note appears at the top of the list, separated from or visually distinguished from unpinned notes.

**Pass Criteria:** Pinned note is first in the list and shows a pin indicator.

**Unpin verification:**
1. Open the pinned note.
2. Click the pin icon again.
3. Navigate to `/notes` — the note returns to its normal sort position.

---

### NOTEF-002 — Sensitivity Toggle

**Description:** Marking a note as sensitive updates the lock icon and routes AI locally.

**Preconditions:** A note is open; the note is currently non-sensitive.

**Steps:**
1. Observe the toolbar — it shows "Public" (or an unlock icon).
2. Click the lock/sensitivity toggle button.

**Expected Result:** The button label changes to "Sensitive" (or shows a locked icon). The note is now flagged as sensitive.

**Pass Criteria:** Toggle state visually changes; reloading the note preserves the sensitive state.

---

### NOTEF-003 — Add Tag to Note

**Description:** Typing a tag name in the note header adds the tag.

**Preconditions:** A note is open.

**Steps:**
1. Click the tag input area in the note header (below the title).
2. Type a new tag name (e.g., `testing`).
3. Press `Enter`.

**Expected Result:** A tag chip labeled "testing" appears in the note header.

**Pass Criteria:** Tag chip visible in note header after pressing Enter.

---

### NOTEF-004 — Remove Tag from Note

**Description:** Clicking the × on a tag chip removes it from the note.

**Preconditions:** A note has at least one tag attached.

**Steps:**
1. Open a note with a tag.
2. Click the `×` button on any tag chip in the note header.

**Expected Result:** The tag chip disappears from the note header.

**Pass Criteria:** Tag chip is no longer visible; reloading the note confirms removal.

---

### NOTEF-005 — Wiki-link Insertion

**Description:** Typing `[[` opens the link picker and inserting a link creates a bidirectional connection.

**Preconditions:** At least two notes exist.

**Steps:**
1. Open a note (Note A).
2. Click inside the editor body.
3. Type `[[`.
4. A picker dropdown appears. Type part of Note B's title.
5. Click Note B from the picker to insert the link.

**Expected Result:** A `[[Note B Title]]` link appears in the editor body. The link is rendered as a clickable element.

**Pass Criteria:** The wiki-link text is visible in the note; clicking it navigates to Note B.

---

### NOTEF-006 — Backlinks Panel

**Description:** A note receives a backlink when another note links to it.

**Preconditions:** Note A contains a `[[Note B]]` wiki-link (from NOTEF-005).

**Steps:**
1. Open Note B.
2. Scroll below the editor.
3. Look for the **Backlinks** collapsible panel.

**Expected Result:** The Backlinks panel shows Note A as a backlink entry.

**Pass Criteria:** Note A's title appears in the Backlinks panel.

---

### NOTEF-007 — Backlinks Panel Collapse/Expand

**Description:** Clicking the Backlinks panel header toggles its visibility.

**Preconditions:** A note with at least one backlink is open.

**Steps:**
1. Find the Backlinks panel (below the editor).
2. Click the panel header to collapse it.
3. Click the panel header again to expand it.

**Expected Result:** Panel collapses (content hidden) then expands (content visible) on each click.

**Pass Criteria:** Panel contents toggle visibility on each header click.

---

### NOTEF-008 — Related Notes Panel

**Description:** The Related Notes panel shows semantically similar notes.

**Preconditions:** AI is configured; the current note has been saved long enough for embeddings to generate (allow a few minutes).

**Steps:**
1. Open a note with substantial content.
2. Scroll below the Backlinks panel.
3. Look for the **Related Notes** panel.

**Expected Result:** The Related Notes panel is visible with at least one section: "Semantically Similar" or "Mentioned in this note".

**Pass Criteria:** Related Notes panel renders without error; sections are labeled correctly.

---

### NOTEF-009 — Markdown Export of Note

**Description:** Clicking the Export button downloads the note as a .md file.

**Preconditions:** A note is open with a title and some content.

**Steps:**
1. Click the **Export** button in the editor toolbar (download icon).

**Expected Result:** A file download dialog appears for a `.md` file named after the note title.

**Pass Criteria:** Browser triggers a file download; file name matches the note title with `.md` extension.

---

### NOTEF-010 — Breadcrumbs for Nested Notes

**Description:** A note nested under a parent shows breadcrumb navigation.

**Preconditions:** A parent note exists; a child note has been assigned to it via the "Move to" option.

**Steps:**
1. Open a child note.
2. Observe the area at the top of the note editor.

**Expected Result:** Breadcrumb trail shows the parent note's title as a clickable link above the note title.

**Pass Criteria:** Parent note title is visible as a link; clicking it navigates to the parent.

---

## 4. Note Templates

### TMPL-001 — Create Template from Existing Note

**Description:** Save a note as a template via the editor's three-dot menu.

**Preconditions:** A note is open with content.

**Steps:**
1. In the editor toolbar, open the three-dot menu (···).
2. Click **Save as template**.
3. Provide a template name if prompted.

**Expected Result:** A success toast confirms the template was saved.

**Pass Criteria:** Template appears in Settings → Templates; "New Note" dropdown includes the template name.

---

### TMPL-002 — Create Note from Template

**Description:** Selecting a template from the "New Note" dropdown pre-fills content.

**Preconditions:** At least one template exists (created in TMPL-001 or via Settings).

**Steps:**
1. Click the **New Note** dropdown in the sidebar.
2. The dropdown lists "Blank note" and any saved templates. Click a template name.

**Expected Result:** A new note opens with the template's content pre-populated in the editor body.

**Pass Criteria:** Editor body contains the template content; note URL is `/notes/<new-id>`.

---

### TMPL-003 — New Note Dropdown Shows Templates

**Description:** The "New Note" button is a dropdown with all available templates listed.

**Preconditions:** At least one template exists.

**Steps:**
1. Click **New Note** in the sidebar.

**Expected Result:** A dropdown menu appears showing "Blank note" plus one entry per saved template.

**Pass Criteria:** "Blank note" is always listed; all saved templates appear as additional options.

---

## 5. Journal

### JOUR-001 — Journal Page Loads

**Description:** The journal page renders the heading and activity heatmap.

**Preconditions:** User is logged in.

**Steps:**
1. Click **Journal** in the sidebar (or navigate to `/journal`).

**Expected Result:** Page shows "Journal" heading; a 52-week calendar heatmap grid is visible; a **Today** button is present.

**Pass Criteria:** Heading, heatmap, and Today button all visible.

---

### JOUR-002 — Today Button Navigates to Today's Entry

**Description:** Clicking "Today" navigates to the current date's journal entry.

**Preconditions:** On the journal page.

**Steps:**
1. Click the **Today** button.

**Expected Result:** Browser navigates to `/journal/<YYYY-MM-DD>` where the date is today's date.

**Pass Criteria:** URL contains today's ISO date; page heading contains that date.

---

### JOUR-003 — Create/Edit Today's Entry

**Description:** Writing in today's journal entry saves content.

**Preconditions:** On today's journal entry page (`/journal/<today>`).

**Steps:**
1. Click in the editor body.
2. Type `Today's test journal entry.`
3. Wait for auto-save.

**Expected Result:** Footer shows "Saving..." then "Saved".

**Pass Criteria:** "Saved" indicator appears within 5 seconds of stopping typing.

---

### JOUR-004 — Mood Picker

**Description:** Setting a mood value saves and persists.

**Preconditions:** Today's journal entry is open.

**Steps:**
1. Locate the **Mood** label at the top of the entry.
2. Click a value between 1 and 5.
3. Reload the page.

**Expected Result:** After reload, the same mood value is still selected.

**Pass Criteria:** Mood value persists across page reload.

---

### JOUR-005 — Energy Picker

**Description:** Setting an energy value saves and persists.

**Preconditions:** Today's journal entry is open.

**Steps:**
1. Locate the **Energy** label at the top of the entry.
2. Click a value between 1 and 5.
3. Reload the page.

**Expected Result:** After reload, the same energy value is still selected.

**Pass Criteria:** Energy value persists across page reload.

---

### JOUR-006 — Date Navigation via Heatmap

**Description:** Clicking a heatmap cell navigates to that date's entry.

**Preconditions:** On the `/journal` page.

**Steps:**
1. Hover a cell in the heatmap to reveal its date tooltip.
2. Click that cell.

**Expected Result:** Browser navigates to `/journal/<date-of-cell>`.

**Pass Criteria:** URL contains the date that was hovered; page heading shows that date.

---

### JOUR-007 — Streak Counter Display

**Description:** The streak counter shows consecutive days of journaling.

**Preconditions:** At least one journal entry exists.

**Steps:**
1. Navigate to `/journal`.

**Expected Result:** A flame icon and a "N day streak" counter are visible below the heatmap.

**Pass Criteria:** Streak counter is visible and shows a non-negative integer.

---

### JOUR-008 — Journal Entry Sensitivity (Default Sensitive)

**Description:** New journal entries are sensitive by default.

**Preconditions:** Create a new journal entry on a date that has no existing entry.

**Steps:**
1. Navigate to a past date without an entry (e.g., `/journal/2020-01-01`).
2. Type any content.
3. Observe the sensitivity toggle in the editor toolbar.

**Expected Result:** The sensitivity toggle shows "Sensitive" (locked state) by default.

**Pass Criteria:** Lock icon / "Sensitive" label visible without manual activation.

---

### JOUR-009 — Delete Journal Entry

**Description:** Deleting a journal entry moves it to Trash.

**Preconditions:** A journal entry with content is open.

**Steps:**
1. Click **Delete** in the journal entry header.
2. Confirm the deletion in the dialog.

**Expected Result:** Entry is removed from the journal view. It appears in `/trash`.

**Pass Criteria:** Entry absent from journal calendar; entry visible in Trash.

---

## 6. Search

### SRCH-001 — Search Page Loads

**Description:** The search page renders with the search input and mode selector.

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to `/search` (or click **Search** in the sidebar).

**Expected Result:** Page shows "Search" heading, a search input with placeholder "Search your knowledge base...", and three mode buttons: **Full-text**, **Semantic**, **Combined**.

**Pass Criteria:** All three elements visible.

---

### SRCH-002 — Full-text Search Returns Results

**Description:** Entering a keyword that appears in a note returns that note in results.

**Preconditions:** At least one note exists with known content (e.g., "QA Test Note" created in NOTES-003).

**Steps:**
1. On `/search`, ensure **Full-text** mode is selected.
2. Type `QA Test` in the search input and press `Enter`.

**Expected Result:** The note "QA Test Note" appears in the results list.

**Pass Criteria:** "QA Test Note" is listed in search results.

---

### SRCH-003 — Mode Selector Switches Between Modes

**Description:** Clicking each mode button visually activates that mode.

**Preconditions:** On the search page.

**Steps:**
1. Click **Semantic** mode button.
2. Click **Full-text** mode button.
3. Click **Combined** mode button.

**Expected Result:** Each clicked button appears highlighted/active; the previously active button becomes inactive.

**Pass Criteria:** Only one mode button is active at any time; clicking each button changes the active state.

---

### SRCH-004 — Semantic Search Returns Relevant Results

**Description:** A semantic query returns conceptually related notes even without exact keyword match.

**Preconditions:** AI is configured; notes have embeddings (allow a few minutes after creation).

**Steps:**
1. Switch to **Semantic** mode on `/search`.
2. Enter a query that is conceptually related to an existing note but uses different words.
3. Press `Enter`.

**Expected Result:** Conceptually related notes appear in results; results may differ from full-text results.

**Pass Criteria:** Results list is non-empty; no error is shown.

---

### SRCH-005 — Combined Mode Returns Results

**Description:** Combined mode returns results and is the default mode.

**Preconditions:** Notes exist with content.

**Steps:**
1. Navigate to `/search`.
2. Confirm **Combined** is the default selected mode (or select it manually).
3. Enter any query term and press `Enter`.

**Expected Result:** Results appear; they may include both exact and semantic matches.

**Pass Criteria:** Results list populates without error.

---

### SRCH-006 — Search Handles Special Characters Without Crash

**Description:** Entering regex special characters in the search field does not cause an error or crash.

**Preconditions:** On the search page.

**Steps:**
1. Type `(test)` in the search input and press `Enter`.
2. Then type `test.*note` and press `Enter`.

**Expected Result:** Search runs without a 500 error or JavaScript exception. Results (possibly empty) are shown.

**Pass Criteria:** No error toast; no browser console exception; page remains functional.

---

### SRCH-007 — Command Palette Opens

**Description:** Pressing `Ctrl+K` opens the command palette from any page.

**Preconditions:** User is logged in; focus is not inside a text input.

**Steps:**
1. Navigate to any page (e.g., `/notes`).
2. Click outside any text input to ensure focus is on the page body.
3. Press `Ctrl+K` (Mac: `Cmd+K`).

**Expected Result:** A modal command palette opens with a search input field.

**Pass Criteria:** Command palette overlay is visible; a search input is focused.

---

### SRCH-008 — Command Palette Sidebar Button

**Description:** Clicking the search button in the sidebar opens the command palette.

**Preconditions:** User is logged in.

**Steps:**
1. Locate the **Search...** button in the sidebar.
2. Click it.

**Expected Result:** The command palette opens with a search input.

**Pass Criteria:** Command palette overlay is visible.

---

## 7. AI Chat

> **Prerequisite for this section:** AI must be configured (Anthropic API key or Ollama with `llama3`).

### AICH-001 — AI Chat Page Loads

**Description:** The AI Chat page renders its core elements.

**Preconditions:** User is logged in.

**Steps:**
1. Click **AI Chat** in the sidebar (or navigate to `/ai`).

**Expected Result:** Page shows "AI Chat" heading, a **New Chat** button, suggestion chips (e.g., "What did I write about recently?"), and a chat input field with placeholder "Ask your second brain...".

**Pass Criteria:** All four elements visible.

---

### AICH-002 — Send a Chat Message and Receive a Response

**Description:** Submitting a question returns an AI-generated answer.

**Preconditions:** AI is configured; user is on `/ai`.

**Steps:**
1. Click in the chat input field.
2. Type `What is this app?`
3. Press `Enter` or click the send button.

**Expected Result:** The user's message appears in the chat thread. After a few seconds, an AI response appears below it.

**Pass Criteria:** A non-empty AI response appears in the chat thread.

---

### AICH-003 — Source Citations in Response

**Description:** Chat responses include citations linking back to source notes.

**Preconditions:** At least one note exists with content relevant to the query.

**Steps:**
1. Create a note titled "Climate change effects" with body content about the topic.
2. Wait 2–3 minutes for embeddings to generate.
3. Go to `/ai` and ask "What do I know about climate change?"

**Expected Result:** The AI response includes citation links referencing the note.

**Pass Criteria:** At least one citation link appears below or within the response text.

---

### AICH-004 — New Conversation Button

**Description:** Clicking "New Chat" starts a fresh conversation.

**Preconditions:** An existing conversation is displayed in the AI Chat panel.

**Steps:**
1. Click the **New Chat** button.

**Expected Result:** The chat thread clears; the suggestion chips reappear; the input field is empty.

**Pass Criteria:** Previous messages no longer visible; suggestion chips visible; input is empty.

---

### AICH-005 — Conversation History Persists

**Description:** Past conversations are listed in the sidebar panel and can be reloaded.

**Preconditions:** At least one chat message has been sent in a prior conversation.

**Steps:**
1. Send a message and receive a response.
2. Click **New Chat** to start a fresh conversation.
3. Observe the left panel of the AI Chat page — previous conversation(s) should be listed.
4. Click a previous conversation entry.

**Expected Result:** The prior conversation's messages reload in the main chat area.

**Pass Criteria:** Previous messages are visible after clicking the conversation entry.

---

### AICH-006 — Suggestion Chips Are Clickable

**Description:** Clicking a suggestion chip populates the input field with that query.

**Preconditions:** On the AI Chat page with a new (empty) conversation.

**Steps:**
1. Click the chip labeled "What did I write about recently?"

**Expected Result:** The chat input is populated with that phrase, or the message is sent directly.

**Pass Criteria:** Either the input field contains the chip text, or a message is sent and a response is displayed.

---

## 8. AI Writing Assistant

> **Prerequisite:** AI must be configured. A note must be open in the editor.

### AIWA-001 — BubbleMenu Appears on Text Selection

**Description:** Selecting text in the editor shows the floating BubbleMenu toolbar.

**Preconditions:** A note is open with at least one sentence of content.

**Steps:**
1. Click and drag to select a sentence or phrase in the note editor body.

**Expected Result:** A floating toolbar (BubbleMenu) appears above the selection with buttons: **Improve**, **Simplify**, **Expand**, **Summarize**.

**Pass Criteria:** All four action buttons are visible in the floating menu.

---

### AIWA-002 — Improve Action Replaces Selection

**Description:** Clicking "Improve" replaces the selected text with an AI-improved version.

**Preconditions:** Text is selected in the editor; BubbleMenu is visible.

**Steps:**
1. Select a sentence in the note editor.
2. Click **Improve** in the BubbleMenu.

**Expected Result:** The selected text is replaced with an AI-rewritten version that improves clarity or flow.

**Pass Criteria:** Selected text is replaced; new text differs from original; no error toast.

---

### AIWA-003 — Simplify Action Replaces Selection

**Description:** Clicking "Simplify" replaces selected text with a shorter, plainer version.

**Preconditions:** Text is selected; BubbleMenu is visible.

**Steps:**
1. Select a sentence or paragraph in the note editor.
2. Click **Simplify** in the BubbleMenu.

**Expected Result:** Selection is replaced with simplified text.

**Pass Criteria:** Text is replaced; new text is visible; no error.

---

### AIWA-004 — Expand Action Replaces Selection

**Description:** Clicking "Expand" replaces selected text with a more detailed version.

**Preconditions:** Text is selected; BubbleMenu is visible.

**Steps:**
1. Select a short phrase.
2. Click **Expand** in the BubbleMenu.

**Expected Result:** Selection is replaced with expanded text that adds detail or elaboration.

**Pass Criteria:** Replacement text is longer than the original; no error.

---

### AIWA-005 — Summarize Action Replaces Selection

**Description:** Clicking "Summarize" condenses the selected text to its key point.

**Preconditions:** A paragraph or more of text is selected.

**Steps:**
1. Select a multi-sentence paragraph.
2. Click **Summarize** in the BubbleMenu.

**Expected Result:** Selection is replaced with a condensed summary.

**Pass Criteria:** Replacement text is shorter than the original; no error.

---

### AIWA-006 — Undo After AI Transformation

**Description:** `Ctrl+Z` reverts an AI writing transformation.

**Preconditions:** An AI transformation (from AIWA-002 through AIWA-005) was just applied.

**Steps:**
1. After an AI transformation replaces text, press `Ctrl+Z` (Mac: `Cmd+Z`).

**Expected Result:** The original text is restored.

**Pass Criteria:** Editor content reverts to pre-transformation state.

---

## 9. Auto-tagging

> **Prerequisite:** AI sidecar must be running; AI must be configured.

### AUTOT-001 — Auto-tag Banner Appears After Save

**Description:** After saving a note with sufficient content, an amber banner suggests tags.

**Preconditions:** Auto-tagging is enabled in Settings → Preferences (default: on).

**Steps:**
1. Create a new blank note.
2. Type a paragraph of descriptive content (at least 20–30 words about a clear topic).
3. Wait. The note auto-saves. The background job processes (may take 1–5 minutes).
4. Remain on the note page. The page polls every 10 seconds.

**Expected Result:** An amber banner appears at the top of the editor with one or more tag chips. The banner includes **Apply** and **Dismiss** buttons.

**Pass Criteria:** Amber banner with tag chips becomes visible without a page reload.

---

### AUTOT-002 — Accept Individual Tag Suggestion

**Description:** Clicking a tag chip in the banner applies only that tag to the note.

**Preconditions:** The auto-tag banner is visible with multiple tag suggestions.

**Steps:**
1. In the amber banner, click one of the individual tag chip buttons (not "Apply All").

**Expected Result:** That specific tag is added to the note's tags. The accepted chip is removed from the banner or the banner updates.

**Pass Criteria:** Tag chip appears in the note header; the suggestion banner updates or dismisses.

---

### AUTOT-003 — Apply All Tag Suggestions

**Description:** Clicking "Apply" on the banner applies all suggested tags at once.

**Preconditions:** The auto-tag banner is visible.

**Steps:**
1. Click **Apply** in the amber banner.

**Expected Result:** All suggested tags are added to the note's tag list in the header. The banner dismisses.

**Pass Criteria:** All suggested tags appear as chips in the note header; banner is gone.

---

### AUTOT-004 — Dismiss Tag Suggestions

**Description:** Clicking "Dismiss" clears the banner without adding any tags.

**Preconditions:** The auto-tag banner is visible.

**Steps:**
1. Click **Dismiss** in the amber banner.

**Expected Result:** The banner disappears. No tags are added to the note.

**Pass Criteria:** Banner is gone; note header tag list is unchanged.

---

## 10. Daily Digest

> **Prerequisite:** AI must be configured; notes and journal entries must exist (ideally with some older than 14–30 days in the database).

### DIGE-001 — Digest Page Loads and Shows Sections

**Description:** Visiting `/digest` triggers the digest generation and displays four sections.

**Preconditions:** User is logged in; AI is configured.

**Steps:**
1. Click the **Digest** link (lightbulb icon) in the sidebar, or navigate to `/digest`.
2. Wait for the page to finish loading (may take 5–15 seconds while AI processes).

**Expected Result:** The page renders four sections:
- Forgotten Relevance
- On This Day
- Orphan Detection
- Cluster Alerts

Each section either shows relevant content or a "nothing found" empty state.

**Pass Criteria:** All four section headings are visible; no JavaScript error or 500 response.

---

### DIGE-002 — Orphan Detection Section

**Description:** Notes with no tags and no links older than 14 days appear in the Orphan Detection section.

**Preconditions:** At least one note exists that is older than 14 days, has no tags, and has no wiki-links.

**Steps:**
1. Navigate to `/digest`.
2. Wait for processing to complete.
3. Locate the **Orphan Detection** section.

**Expected Result:** The untagged, unlinked note is listed in the Orphan Detection section.

**Pass Criteria:** At least one note entry appears in the Orphan Detection section.

---

### DIGE-003 — On This Day Section

**Description:** Journal entries from prior years on today's calendar date appear in the On This Day section.

**Preconditions:** A journal entry exists for today's date in a prior year (requires manually creating an entry at a past date URL).

**Steps:**
1. Navigate to `/digest`.
2. Locate the **On This Day** section.

**Expected Result:** Past journal entries from the same month/day appear in this section.

**Pass Criteria:** Section either shows entries or a clear "No past entries for today" empty state; no error.

---

## 11. Tags

### TAGS-001 — Create Tag with Color in Settings

**Description:** Creating a tag from Settings assigns a name and color.

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to `/settings` and locate the **Tags** section.
2. Type a tag name in the "New tag name" input (e.g., `research`).
3. Select a color from the 8 preset color swatches.
4. Click **Add** (or **Create**).

**Expected Result:** The new tag appears in the tags list with its chosen color indicator.

**Pass Criteria:** Tag "research" is listed with the correct color.

---

### TAGS-002 — Assign Tag to Note

**Description:** Tags created in Settings can be assigned to notes.

**Preconditions:** A tag named "research" exists (from TAGS-001).

**Steps:**
1. Open any note.
2. Click the tag input in the note header.
3. Start typing `res` — the existing "research" tag should appear as a suggestion.
4. Click the suggestion to apply it.

**Expected Result:** The "research" tag chip appears in the note header.

**Pass Criteria:** Tag chip with the correct color appears in the note header.

---

### TAGS-003 — Remove Tag from Note

**Description:** Clicking the × on a tag chip removes that tag assignment.

**Preconditions:** A note has the "research" tag applied.

**Steps:**
1. Open the note with "research" tag.
2. Click the `×` on the "research" tag chip.

**Expected Result:** The "research" chip disappears from the note header.

**Pass Criteria:** Tag chip is absent after clicking ×; confirmed by reloading the page.

---

### TAGS-004 — Delete Tag from Settings

**Description:** Deleting a tag from Settings removes it from all content.

**Preconditions:** A tag exists and is applied to at least one note.

**Steps:**
1. Navigate to `/settings` → Tags section.
2. Click the trash icon next to the tag to delete.
3. Confirm if prompted.

**Expected Result:** The tag is removed from the Settings list. Open a note that had this tag — the tag chip is no longer present.

**Pass Criteria:** Tag absent from Settings list; absent from all notes that previously had it.

---

## 12. Import

### IMPT-001 — Import Page Loads

**Description:** The import page renders the drag-and-drop zone.

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to `/import` (or click **Import** in the sidebar).

**Expected Result:** Page shows "Import Notes" heading, a drag-and-drop zone with "Drag and drop files here" text, and a **Browse Files** button.

**Pass Criteria:** Heading, drop zone, and Browse Files button are visible.

---

### IMPT-002 — Import a Markdown File

**Description:** Uploading a `.md` file creates a new note.

**Preconditions:** A `.md` file exists on the local machine (e.g., create `test-import.md` with content "# Imported Note\n\nThis is imported content.").

**Steps:**
1. Navigate to `/import`.
2. Click **Browse Files** and select `test-import.md`.
3. Wait for the upload to complete (progress indicator should appear).

**Expected Result:** A success message or progress completion is shown. Navigating to `/notes` shows a note titled "test-import".

**Pass Criteria:** "test-import" note appears in the notes list with the imported content.

---

### IMPT-003 — Import Multiple Files via Drag and Drop

**Description:** Dragging multiple markdown files onto the drop zone imports all of them.

**Preconditions:** Two `.md` files exist on the local machine.

**Steps:**
1. Navigate to `/import`.
2. Drag both files simultaneously onto the drop zone.

**Expected Result:** Both files are uploaded and processed. Two new notes appear in `/notes`.

**Pass Criteria:** Both note titles appear in the notes list after import.

---

## 13. Export

### EXPO-001 — Export Page Loads

**Description:** The export page renders with a download button.

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to `/export` (or click **Export** in the sidebar).

**Expected Result:** Page renders a **Download Export** button.

**Pass Criteria:** Download button is visible.

---

### EXPO-002 — Download Export JSON

**Description:** Clicking the download button triggers a JSON file download.

**Preconditions:** At least one note and one journal entry exist.

**Steps:**
1. Navigate to `/export`.
2. Click **Download Export**.

**Expected Result:** Browser downloads a file named `second-brain-export-<date>.json`.

**Pass Criteria:** File download initiates; file extension is `.json`.

---

### EXPO-003 — Verify Export Contents

**Description:** The downloaded JSON contains all expected top-level keys.

**Preconditions:** Export file was downloaded in EXPO-002.

**Steps:**
1. Open the downloaded JSON file in a text editor.
2. Verify the top-level keys.

**Expected Result:** The JSON object contains the keys: `notes`, `journalEntries`, `tags`, `tagAssignments`, `noteLinks`, `templates`.

**Pass Criteria:** All six keys are present at the top level of the JSON object.

---

### EXPO-004 — Trashed Items Not in Export

**Description:** Notes moved to Trash are excluded from the export.

**Preconditions:** At least one note is in the Trash.

**Steps:**
1. Note the title of a trashed note.
2. Download the export.
3. Search the export JSON for that title.

**Expected Result:** The trashed note title does not appear in the `notes` array.

**Pass Criteria:** Trashed note is absent from the export `notes` array.

---

## 14. Trash

### TRSH-001 — Trash Page Loads

**Description:** The trash page renders the heading and any trashed items.

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to `/trash` (or click **Trash** in the sidebar).

**Expected Result:** Page shows "Trash" heading. If items are present, they are listed with **Restore** and **Delete permanently** (X) options.

**Pass Criteria:** "Trash" heading visible; page renders without error.

---

### TRSH-002 — Restore Note from Trash

**Description:** A trashed note can be restored and returns to the notes list.

**Preconditions:** At least one note is in Trash.

**Steps:**
1. Navigate to `/trash`.
2. Click **Restore** next to a trashed note.

**Expected Result:** The note disappears from the Trash list. Navigating to `/notes` shows the restored note.

**Pass Criteria:** Note absent from Trash; note present and accessible in the notes list.

---

### TRSH-003 — Permanently Delete Single Item

**Description:** Clicking the X on a trashed note permanently removes it.

**Preconditions:** At least one note is in Trash.

**Steps:**
1. Navigate to `/trash`.
2. Click the **X** (permanent delete) button next to a trashed note.
3. Confirm the deletion in the dialog.

**Expected Result:** The note is removed from Trash and cannot be restored. It is gone permanently.

**Pass Criteria:** Note no longer appears in Trash or in `/notes`; refreshing the page confirms removal.

---

### TRSH-004 — Empty Trash

**Description:** The "Empty Trash" button permanently deletes all trashed items at once.

**Preconditions:** At least two items are in Trash.

**Steps:**
1. Navigate to `/trash`.
2. Click the **Empty Trash** button at the top.
3. Confirm the action in the dialog.

**Expected Result:** All items are removed from Trash. The page shows an empty Trash state.

**Pass Criteria:** Trash list is empty after confirmation; all previously trashed items are gone.

---

### TRSH-005 — Restore Journal Entry from Trash

**Description:** A deleted journal entry can be restored.

**Preconditions:** A journal entry has been deleted (from JOUR-009).

**Steps:**
1. Navigate to `/trash`.
2. Find the trashed journal entry.
3. Click **Restore**.

**Expected Result:** The entry returns to the journal. Navigating to that entry's date shows the content.

**Pass Criteria:** Journal entry is accessible at its original date URL after restore.

---

## 15. Settings

### SETT-001 — Settings Page Loads

**Description:** The Settings page renders all sections.

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to `/settings`.

**Expected Result:** Page shows "Settings" heading. Visible sections include: Tags, Templates, Profile, Editor, Preferences, AI Configuration, Danger Zone.

**Pass Criteria:** "Settings" heading visible; all sections present.

---

### SETT-002 — Profile: Change Password

**Description:** A user can change their password from the Profile section.

**Preconditions:** User is logged in; current password is known.

**Steps:**
1. In Settings → Profile, locate the change password form.
2. Enter the current password.
3. Enter a new password.
4. Enter the new password again in the confirmation field.
5. Submit the form.

**Expected Result:** A success toast confirms the password change. Subsequent login uses the new password.

**Pass Criteria:** Success toast shown; logging out and back in with the new password succeeds.

---

### SETT-003 — Profile: Change Email

**Description:** A user can change their email address.

**Preconditions:** User is logged in; a new email address is available (not used by another account).

**Steps:**
1. In Settings → Profile, enter a new email address in the email change field.
2. Submit the form.

**Expected Result:** A success toast is shown. The user is signed out. Logging in with the new email works.

**Pass Criteria:** Success toast shown; the sidebar shows the new email after re-login.

---

### SETT-004 — Editor: Font Size Slider

**Description:** Moving the font size slider changes the editor's font size immediately.

**Preconditions:** A note is open in another browser tab, or open Settings and note in the same session.

**Steps:**
1. In Settings → Editor, move the **Font size** slider to a visibly different value (e.g., drag to 22).
2. Open (or switch to) a note editor.

**Expected Result:** The editor text renders at the new font size immediately (no page reload required).

**Pass Criteria:** Editor font size visually differs from the default (16px); the slider value is saved to localStorage and persists across page reload.

---

### SETT-005 — Editor: Line Spacing Slider

**Description:** Moving the line spacing slider changes editor line height immediately.

**Preconditions:** A note is open or accessible.

**Steps:**
1. In Settings → Editor, move the **Line spacing** slider (e.g., drag to 2.2).
2. Open (or switch to) a note editor.

**Expected Result:** Editor line height visually increases. Setting persists across reload.

**Pass Criteria:** Editor line height visually changes; localStorage value updated.

---

### SETT-006 — Preferences: Toast Notifications Toggle

**Description:** Disabling toast notifications suppresses success/error toasts.

**Preconditions:** Toast notifications are enabled (default).

**Steps:**
1. In Settings → Preferences, toggle **Toast notifications** off.
2. Perform an action that normally shows a toast (e.g., create a note).

**Expected Result:** No toast notification appears for the action.

**Pass Criteria:** Toast is suppressed after disabling the toggle.

---

### SETT-007 — Preferences: Default Search Mode

**Description:** Changing the default search mode changes what mode is pre-selected on the search page.

**Preconditions:** Default search mode is "Combined" (default).

**Steps:**
1. In Settings → Preferences, change **Default search mode** to **Full-text**.
2. Navigate to `/search`.

**Expected Result:** The **Full-text** mode button is pre-selected on the search page.

**Pass Criteria:** Full-text mode is active on the search page without manual selection.

---

### SETT-008 — AI Configuration: Switch Cloud Provider

**Description:** Switching to "OpenAI Compatible" reveals configuration fields.

**Preconditions:** Cloud provider is currently set to "Anthropic" (default).

**Steps:**
1. In Settings → AI Configuration → Cloud Provider, select **OpenAI Compatible**.

**Expected Result:** Three input fields appear: **Base URL**, **API Key**, and **Model Name**. Preset buttons appear for OpenAI, Groq, and Together AI.

**Pass Criteria:** All three fields and the preset buttons are visible.

---

### SETT-009 — AI Configuration: Provider Preset Buttons

**Description:** Clicking a preset button auto-fills the Base URL field.

**Preconditions:** OpenAI Compatible provider is selected (from SETT-008).

**Steps:**
1. Click the **OpenAI** preset button.

**Expected Result:** The Base URL field is populated with `https://api.openai.com/v1`.

**Pass Criteria:** Base URL field contains the correct OpenAI endpoint URL.

---

### SETT-010 — Danger Zone: Delete Account

**Description:** Account deletion requires password confirmation and removes all data.

**Preconditions:** A disposable test account is available. **Do not run this test on your primary account.**

**Steps:**
1. Log in as the test account.
2. Navigate to Settings → Danger Zone.
3. Click **Delete Account**.
4. Enter the account password in the confirmation dialog.
5. Click **Confirm Delete**.

**Expected Result:** All account data is deleted. User is redirected to `/register` or `/login`. Attempting to log in with those credentials fails.

**Pass Criteria:** Login with deleted credentials returns an error; no data persists for that account.

---

## 16. Theme

### THEM-001 — Dark Mode

**Description:** Selecting Dark mode applies dark colors throughout the app.

**Preconditions:** User is logged in.

**Steps:**
1. Locate the **theme toggle** in the sidebar (bottom section).
2. Click to select **Dark** mode.

**Expected Result:** The application background switches to a dark color scheme. The `<html>` element no longer has the `.light` class.

**Pass Criteria:** Background is dark; text is light; no `.light` class on `<html>`.

---

### THEM-002 — Light Mode

**Description:** Selecting Light mode applies light colors throughout the app.

**Preconditions:** App is currently in Dark mode.

**Steps:**
1. Click the theme toggle in the sidebar.
2. Select **Light** mode.

**Expected Result:** Background switches to a light color scheme. The `.light` class is added to `<html>`.

**Pass Criteria:** Background is white/light grey; `.light` class present on `<html>` element.

---

### THEM-003 — System Mode

**Description:** System mode follows the OS appearance setting.

**Preconditions:** User is logged in.

**Steps:**
1. Click the theme toggle and select **System**.
2. Note the current OS appearance (dark or light).

**Expected Result:** App theme matches the current OS appearance setting.

**Pass Criteria:** App theme matches OS preference. Changing OS theme (if possible) would change the app theme.

---

### THEM-004 — Theme Persists Across Reload

**Description:** The selected theme is preserved after a page reload.

**Preconditions:** Light mode is selected.

**Steps:**
1. Select **Light** mode.
2. Reload the page.

**Expected Result:** App remains in Light mode after reload (no flash of dark theme).

**Pass Criteria:** Theme is consistent before and after reload.

---

## 17. Mobile Responsive

### MOB-001 — Hamburger Menu on Small Screen

**Description:** On a narrow viewport, the sidebar is hidden and a hamburger menu is shown.

**Preconditions:** User is logged in.

**Steps:**
1. Open browser DevTools and set viewport to 375 × 812 (iPhone SE size).
2. Reload the page.

**Expected Result:** The sidebar is hidden. A hamburger menu icon (≡) appears in the top-left corner.

**Pass Criteria:** Sidebar not visible; hamburger icon visible.

---

### MOB-002 — Sidebar Overlay Opens on Mobile

**Description:** Tapping the hamburger menu opens the sidebar as an overlay.

**Preconditions:** Viewport is narrow (from MOB-001).

**Steps:**
1. Click the hamburger menu icon.

**Expected Result:** The sidebar slides in as an overlay. Navigation links (Notes, Journal, Search, etc.) are visible.

**Pass Criteria:** Sidebar overlay is visible with navigation links.

---

### MOB-003 — Bottom Navigation Bar on Mobile

**Description:** A bottom navigation bar with quick-access icons is visible on small screens.

**Preconditions:** Viewport is narrow (375px wide).

**Steps:**
1. Observe the bottom of the screen on any page.

**Expected Result:** A bottom navigation bar is visible with icons for Notes, Journal, Search, and AI Chat.

**Pass Criteria:** Bottom nav bar is visible with at least 3–4 navigation icons.

---

### MOB-004 — Bottom Nav Navigates Correctly

**Description:** Tapping bottom nav icons navigates to the correct pages.

**Preconditions:** Bottom nav is visible (from MOB-003).

**Steps:**
1. Tap the **Journal** icon in the bottom nav.
2. Confirm the page changes to `/journal`.
3. Tap the **Search** icon.
4. Confirm the page changes to `/search`.

**Expected Result:** Each bottom nav tap navigates to the correct page.

**Pass Criteria:** URL changes to match tapped destination.

---

## 18. Keyboard Shortcuts

> These shortcuts only activate when focus is NOT inside a text input.

### KBSC-001 — N Key Navigates to Notes

**Description:** Pressing `N` while not in a text input navigates to the notes page.

**Preconditions:** User is logged in; no text input is focused.

**Steps:**
1. Navigate to `/journal` (or any non-notes page).
2. Click on an empty area of the page (not inside any input).
3. Press `N`.

**Expected Result:** Browser navigates to `/notes`.

**Pass Criteria:** URL changes to `/notes`.

---

### KBSC-002 — J Key Navigates to Journal

**Description:** Pressing `J` navigates to the journal page.

**Preconditions:** User is logged in; no text input is focused.

**Steps:**
1. Navigate to `/notes`.
2. Click on an empty area of the page.
3. Press `J`.

**Expected Result:** Browser navigates to `/journal`.

**Pass Criteria:** URL changes to `/journal`.

---

### KBSC-003 — Forward Slash Key Navigates to Search

**Description:** Pressing `/` navigates to the search page.

**Preconditions:** User is logged in; no text input is focused.

**Steps:**
1. Navigate to any non-search page.
2. Click on an empty area.
3. Press `/`.

**Expected Result:** Browser navigates to `/search`.

**Pass Criteria:** URL changes to `/search`.

---

### KBSC-004 — Question Mark Key Opens Help Modal

**Description:** Pressing `?` opens a keyboard shortcut reference modal.

**Preconditions:** User is logged in; no text input is focused.

**Steps:**
1. Click on an empty area of the page.
2. Press `?`.

**Expected Result:** A help modal opens listing all available keyboard shortcuts.

**Pass Criteria:** A modal or overlay is visible with shortcut information.

---

### KBSC-005 — Ctrl+K Opens Command Palette

**Description:** `Ctrl+K` opens the command palette from anywhere.

**Preconditions:** User is logged in.

**Steps:**
1. Navigate to any page.
2. Press `Ctrl+K` (Mac: `Cmd+K`).

**Expected Result:** The command palette opens with a search input focused.

**Pass Criteria:** Command palette overlay visible; input is focused and ready for input.

---

### KBSC-006 — Shortcuts Inactive Inside Text Inputs

**Description:** Single-key shortcuts do not fire when a text input is focused.

**Preconditions:** A note is open with the editor body focused.

**Steps:**
1. Click inside the note editor body.
2. Press `N`, `J`, and `/`.

**Expected Result:** The letters `NJ/` are typed into the editor — no navigation occurs.

**Pass Criteria:** Characters appear in the editor; URL does not change.

---

## 19. PWA

### PWA-001 — PWA Install Prompt Available

**Description:** The app is installable as a PWA from a supported browser.

**Preconditions:** Using Chrome or Edge; app is served over HTTP (localhost qualifies).

**Steps:**
1. Open `http://localhost:3001` in Chrome.
2. Look for an install icon in the browser address bar (a computer screen icon with a + or a "Install" option in the browser menu).
3. Alternatively: open Chrome menu → "Cast, save, and share" → "Install Second Brain".

**Expected Result:** An install option is available. Clicking it prompts to install the app.

**Pass Criteria:** Install option appears in the browser UI without error.

---

### PWA-002 — PWA Manifest is Valid

**Description:** The PWA manifest file is served and contains required fields.

**Preconditions:** App is running.

**Steps:**
1. Open `http://localhost:3001/manifest.json` in the browser.

**Expected Result:** A JSON object is returned containing `name`, `short_name`, `icons`, `start_url`, and `display` fields.

**Pass Criteria:** All five manifest fields are present and non-empty.

---

## 20. AI Status Indicator

### AIST-001 — Green Dot When AI is Ready

**Description:** When the AI sidecar is running, a green dot appears next to "AI Chat" in the sidebar.

**Preconditions:** All Docker services are running including `ai-sidecar`.

**Steps:**
1. Log in and observe the sidebar.
2. Find the **AI Chat** navigation link.

**Expected Result:** A small green dot is visible next to "AI Chat".

**Pass Criteria:** Green dot is visible; no error state displayed.

---

### AIST-002 — Red Dot When AI is Unavailable

**Description:** When the AI sidecar is stopped, the status dot turns red.

**Preconditions:** The `ai-sidecar` container can be stopped for testing.

**Steps:**
1. Stop the AI sidecar: `docker-compose stop ai-sidecar`.
2. Wait up to 60 seconds (the sidebar polls every 60 seconds).
3. Observe the dot next to AI Chat in the sidebar.

**Expected Result:** The dot changes to red, indicating the sidecar is unreachable.

**Pass Criteria:** Red dot visible next to AI Chat.

**Cleanup:** Restart the sidecar: `docker-compose start ai-sidecar`.

---

### AIST-003 — Status Dot Polls Automatically

**Description:** The status dot updates without a page reload.

**Preconditions:** Sidecar was stopped (from AIST-002) and the red dot is showing.

**Steps:**
1. Start the sidecar: `docker-compose start ai-sidecar`.
2. Wait up to 60 seconds without reloading the page.

**Expected Result:** The dot changes back to green automatically.

**Pass Criteria:** Green dot restored within 60 seconds without page reload.

---

## API Tests (curl)

These tests verify backend behavior independently of the UI. Replace `<SESSION_COOKIE>` with the `next-auth.session-token` value from browser DevTools → Application → Cookies → `localhost:3001`.

### API-001 — Register a New User

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "apitest@example.com", "password": "testpass123"}' \
  | python3 -m json.tool
```

**Expected:** `201 Created` with `{"message": "User created"}` (or similar). Running again with the same email returns `409 Conflict`.

---

### API-002 — Fetch Notes List

```bash
curl -s http://localhost:3001/api/v1/notes \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  | python3 -m json.tool
```

**Expected:** `200 OK` with `{"data": [...], "total": N}`. `data` is an array of note objects.

---

### API-003 — Create a Note

```bash
curl -s -X POST http://localhost:3001/api/v1/notes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  -d '{"title": "API Test Note", "content": {}}' \
  | python3 -m json.tool
```

**Expected:** `201 Created` with a note object containing `id`, `title`, `createdAt`.

---

### API-004 — Get a Specific Note

```bash
# Replace <NOTE_ID> with an id from API-002 or API-003
curl -s http://localhost:3001/api/v1/notes/<NOTE_ID> \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  | python3 -m json.tool
```

**Expected:** `200 OK` with the full note object including `content`, `tags`, `isSensitive`.

---

### API-005 — Update a Note

```bash
curl -s -X PUT http://localhost:3001/api/v1/notes/<NOTE_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  -d '{"title": "Updated via API"}' \
  | python3 -m json.tool
```

**Expected:** `200 OK` with the updated note object where `title` is "Updated via API".

---

### API-006 — Soft Delete a Note

```bash
curl -s -X DELETE http://localhost:3001/api/v1/notes/<NOTE_ID> \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>"
```

**Expected:** `200 OK` or `204 No Content`. Subsequent `GET /api/v1/notes/<NOTE_ID>` returns `404`.

---

### API-007 — Permanent Delete a Note

```bash
curl -s -X DELETE http://localhost:3001/api/v1/notes/<NOTE_ID>/permanent \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>"
```

**Expected:** `200 OK`. Note is irreversibly removed including all associated embeddings, tags, and links.

---

### API-008 — Create a Journal Entry

```bash
curl -s -X POST http://localhost:3001/api/v1/journal \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  -d '{"date": "2024-01-15", "content": {}, "mood": 4, "energy": 3}' \
  | python3 -m json.tool
```

**Expected:** `201 Created` with a journal entry object containing `date`, `mood`, `energy`, `isSensitive: true`.

---

### API-009 — Get a Journal Entry by Date

```bash
curl -s http://localhost:3001/api/v1/journal/2024-01-15 \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  | python3 -m json.tool
```

**Expected:** `200 OK` with the journal entry for that date.

---

### API-010 — Search Notes

```bash
curl -s "http://localhost:3001/api/v1/search?q=test&mode=full-text" \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  | python3 -m json.tool
```

**Expected:** `200 OK` with a results array. Each result includes `id`, `title`, `snippet`, `type`.

---

### API-011 — AI Status Check

```bash
curl -s http://localhost:3001/api/v1/ai/status \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  | python3 -m json.tool
```

**Expected:** `200 OK` with `{"status": "ok"}` when the sidecar is healthy, or an error status when it is not.

---

### API-012 — Export Knowledge Base

```bash
curl -s http://localhost:3001/api/v1/export \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  -o second-brain-export.json
python3 -c "import json; d=json.load(open('second-brain-export.json')); print(list(d.keys()))"
```

**Expected:** File downloaded successfully. Python output shows: `['notes', 'journalEntries', 'tags', 'tagAssignments', 'noteLinks', 'templates']`.

---

### API-013 — Get User Settings

```bash
curl -s http://localhost:3001/api/v1/settings \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  | python3 -m json.tool
```

**Expected:** `200 OK` with a settings object containing `autoTagEnabled`, `defaultSearchMode`, `cloudProvider`, and related fields.

---

### API-014 — Update User Settings

```bash
curl -s -X PUT http://localhost:3001/api/v1/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<SESSION_COOKIE>" \
  -d '{"defaultSearchMode": "semantic"}' \
  | python3 -m json.tool
```

**Expected:** `200 OK` with the updated settings object where `defaultSearchMode` is "semantic".

---

### API-015 — Unauthenticated Request Rejected

```bash
curl -s http://localhost:3001/api/v1/notes
```

**Expected:** `401 Unauthorized` — no session cookie means access is denied.

---

## Automated Tests

### Unit Tests (Vitest)

Unit tests cover individual functions and hooks. Run from the `web` directory:

```bash
cd web && npm run test:run
```

Or equivalently:

```bash
cd web && npx vitest run
```

**Expected output:** All tests pass. The test count and duration are printed. Any failures indicate a regression.

**To run in watch mode during development:**
```bash
cd web && npm run test
```

---

### End-to-End Tests (Playwright)

The E2E suite covers 28 automated scenarios across Auth, Notes, Journal, Search, AI Chat, Settings, Trash, Import, Navigation, and 404 behavior.

**Prerequisite:** The app must be running at `http://localhost:3001`.

```bash
# Start the app first
docker-compose up -d

# Run all E2E tests
cd web && npx playwright test
```

**To run a specific test file:**
```bash
cd web && npx playwright test e2e/second-brain.spec.ts
```

**To run a specific test by name:**
```bash
cd web && npx playwright test --grep "login with registered user"
```

**To run with browser UI visible (headed mode):**
```bash
cd web && npx playwright test --headed
```

**To view the HTML test report after a run:**
```bash
cd web && npx playwright show-report
```

**Expected output:** 28 tests passing. Common causes of failure:
- App not running at `http://localhost:3001`
- Database not initialized (run `npx prisma migrate deploy`)
- Prior test data in an unexpected state (tests use a shared `pw-e2e@test.com` account)

---

### Test Coverage Summary

| Area | Manual Scenarios | Automated (Playwright) |
|------|-----------------|----------------------|
| Authentication | AUTH-001 to AUTH-009 | 5 tests |
| Notes CRUD | NOTES-001 to NOTES-009 | 5 tests |
| Note Features | NOTEF-001 to NOTEF-010 | 2 tests (sensitivity, title) |
| Templates | TMPL-001 to TMPL-003 | — |
| Journal | JOUR-001 to JOUR-009 | 4 tests |
| Search | SRCH-001 to SRCH-008 | 3 tests |
| AI Chat | AICH-001 to AICH-006 | 4 tests |
| AI Writing Assistant | AIWA-001 to AIWA-006 | — |
| Auto-tagging | AUTOT-001 to AUTOT-004 | — |
| Daily Digest | DIGE-001 to DIGE-003 | — |
| Tags | TAGS-001 to TAGS-004 | 1 test (tag creation form) |
| Import | IMPT-001 to IMPT-003 | 2 tests |
| Export | EXPO-001 to EXPO-004 | — |
| Trash | TRSH-001 to TRSH-005 | 1 test |
| Settings | SETT-001 to SETT-010 | 1 test |
| Theme | THEM-001 to THEM-004 | — |
| Mobile | MOB-001 to MOB-004 | — |
| Keyboard Shortcuts | KBSC-001 to KBSC-006 | — |
| PWA | PWA-001 to PWA-002 | — |
| AI Status | AIST-001 to AIST-003 | — |
| API (curl) | API-001 to API-015 | — |
| **Total** | **109 manual + 15 API** | **28 automated** |
