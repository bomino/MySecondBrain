# Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the bare-bones UI into a polished "Dark & Warm" aesthetic with amber accent, Lucide icons, micro-animations, and shadcn/ui primitives.

**Architecture:** CSS variable-based theming in globals.css, Tailwind config extended with semantic tokens, shadcn/ui components as building blocks, all existing components restyled in-place.

**Tech Stack:** Tailwind CSS 4, shadcn/ui, Lucide React, CSS custom properties, CSS transitions

**Spec:** `docs/superpowers/specs/2026-04-01-visual-redesign-design.md`

---

## File Structure

```
web/src/
├── app/
│   ├── globals.css                    # REWRITE — CSS variables, theme, base styles
│   ├── layout.tsx                     # MODIFY — default dark class, font
│   ├── page.tsx                       # (no change)
│   ├── (auth)/
│   │   ├── login/page.tsx             # REWRITE — dark styled card
│   │   └── register/page.tsx          # REWRITE — dark styled card
│   └── (app)/
│       ├── layout.tsx                 # MODIFY — ensure dark bg
│       ├── notes/
│       │   ├── page.tsx               # REWRITE — styled header, cards, toggle
│       │   └── [id]/page.tsx          # REWRITE — styled title, editor
│       ├── journal/
│       │   ├── page.tsx               # REWRITE — styled list
│       │   └── [date]/page.tsx        # REWRITE — styled editor, mood
│       ├── search/page.tsx            # REWRITE — styled input, mode selector
│       └── ai/page.tsx                # REWRITE — styled header
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                # REWRITE — icons, search, avatar
│   │   └── command-palette.tsx        # REWRITE — blur overlay, styled
│   ├── editor/
│   │   └── tiptap-editor.tsx          # REWRITE — styled toolbar, prose
│   ├── notes/
│   │   ├── note-list.tsx              # REWRITE — styled cards
│   │   └── note-graph.tsx             # MODIFY — amber nodes
│   ├── journal/
│   │   └── mood-picker.tsx            # REWRITE — amber active
│   ├── search/
│   │   └── search-results.tsx         # REWRITE — styled cards
│   ├── ai/
│   │   ├── chat-panel.tsx             # REWRITE — styled input, empty state
│   │   └── chat-message.tsx           # REWRITE — gradient bubbles, sources
│   └── providers.tsx                  # MODIFY — CSS var theme switching
├── stores/
│   └── ui-store.ts                    # MODIFY — default theme "dark"
├── lib/
│   └── utils.ts                       # CREATE — cn() helper
├── tailwind.config.ts                 # (root) REWRITE — semantic tokens
└── postcss.config.mjs                 # (no change)
```

---

## Task 1: Design Foundation — CSS Variables & Tailwind Config

**Files:**
- Rewrite: `web/src/app/globals.css`
- Rewrite: `web/tailwind.config.ts`
- Create: `web/src/lib/utils.ts`
- Modify: `web/src/app/layout.tsx`
- Modify: `web/src/stores/ui-store.ts`
- Modify: `web/src/components/providers.tsx`

- [ ] **Step 1: Rewrite `web/src/app/globals.css`**

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: #0a0a0a;
    --surface: #171717;
    --elevated: #262626;
    --border: #262626;
    --border-hover: #404040;
    --ring: #d97706;

    --accent: #d97706;
    --accent-hover: #b45309;
    --accent-light: #fbbf24;
    --accent-muted: rgba(217, 119, 6, 0.08);

    --text-primary: #fafafa;
    --text-secondary: #a3a3a3;
    --text-muted: #737373;
    --text-faint: #525252;

    --destructive: #ef4444;
    --success: #22c55e;

    --gradient-accent: linear-gradient(135deg, #d97706, #b45309);
    --gradient-logo: linear-gradient(135deg, #d97706, #ea580c);
  }

  .light {
    --background: #fafafa;
    --surface: #ffffff;
    --elevated: #f5f5f5;
    --border: #e5e5e5;
    --border-hover: #d4d4d4;
    --ring: #d97706;

    --accent: #d97706;
    --accent-hover: #b45309;
    --accent-light: #d97706;
    --accent-muted: rgba(217, 119, 6, 0.08);

    --text-primary: #0a0a0a;
    --text-secondary: #525252;
    --text-muted: #737373;
    --text-faint: #a3a3a3;

    --destructive: #ef4444;
    --success: #22c55e;

    --gradient-accent: linear-gradient(135deg, #d97706, #b45309);
    --gradient-logo: linear-gradient(135deg, #d97706, #ea580c);
  }

  * {
    border-color: var(--border);
  }

  body {
    background-color: var(--background);
    color: var(--text-primary);
    transition: background-color 200ms ease, color 200ms ease;
  }

  ::selection {
    background-color: rgba(217, 119, 6, 0.3);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--text-faint);
  }
}

@layer components {
  .card-hover {
    transition: border-color 150ms ease;
  }
  .card-hover:hover {
    border-color: var(--border-hover);
  }

  .nav-item {
    transition: background-color 150ms ease;
  }
  .nav-item:hover {
    background-color: var(--surface);
  }

  .btn-accent {
    background: var(--gradient-accent);
    color: white;
    border: none;
    font-weight: 500;
    transition: opacity 150ms ease;
  }
  .btn-accent:hover {
    opacity: 0.9;
  }

  .btn-surface {
    background-color: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    transition: border-color 150ms ease, background-color 150ms ease;
  }
  .btn-surface:hover {
    border-color: var(--border-hover);
    background-color: var(--elevated);
  }

  .input-base {
    background-color: var(--elevated);
    border: 1px solid var(--border);
    color: var(--text-primary);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .input-base:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2);
  }

  .tag {
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
  }

  .tag-amber { background: rgba(217, 119, 6, 0.08); color: #fbbf24; }
  .tag-blue { background: rgba(37, 99, 235, 0.08); color: #60a5fa; }
  .tag-green { background: rgba(22, 163, 74, 0.08); color: #4ade80; }
  .tag-red { background: rgba(239, 68, 68, 0.08); color: #f87171; }
  .tag-purple { background: rgba(139, 92, 246, 0.08); color: #a78bfa; }

  .fade-in {
    animation: fadeIn 200ms ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .prose-editor {
    color: var(--text-primary);
    line-height: 1.7;
  }
  .prose-editor h1, .prose-editor h2, .prose-editor h3 {
    color: var(--text-primary);
    font-weight: 600;
  }
  .prose-editor p { color: var(--text-secondary); }
  .prose-editor a { color: var(--accent-light); }
  .prose-editor code {
    background-color: var(--elevated);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
  }
  .prose-editor pre {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
  }
  .prose-editor blockquote {
    border-left: 3px solid var(--accent);
    padding-left: 16px;
    color: var(--text-muted);
  }
  .prose-editor [data-wiki-link] {
    color: var(--accent-light);
    cursor: pointer;
  }
  .prose-editor [data-wiki-link]:hover {
    text-decoration: underline;
  }

  .ProseMirror {
    min-height: 60vh;
    padding: 16px;
    outline: none;
  }
  .ProseMirror p.is-editor-empty:first-child::before {
    color: var(--text-faint);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
}
```

- [ ] **Step 2: Rewrite `web/tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        border: "var(--border)",
        "border-hover": "var(--border-hover)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          light: "var(--accent-light)",
          muted: "var(--accent-muted)",
        },
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        destructive: "var(--destructive)",
        success: "var(--success)",
      },
      borderRadius: {
        DEFAULT: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Create `web/src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Modify `web/src/stores/ui-store.ts` — default theme to "dark"**

Change `theme: "system"` to `theme: "dark"`.

- [ ] **Step 5: Modify `web/src/components/providers.tsx` — CSS variable theme switching**

Replace the ThemeProvider to toggle the `light` class (not `dark`), since dark is the default (no class needed):

```tsx
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else if (theme === "dark") {
      root.classList.remove("light");
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      root.classList.toggle("light", prefersLight);
    }
  }, [theme]);

  return <>{children}</>;
}
```

- [ ] **Step 6: Modify `web/src/app/layout.tsx` — remove dark class, set font**

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
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add web/src/app/globals.css web/tailwind.config.ts web/src/lib/utils.ts \
  web/src/stores/ui-store.ts web/src/components/providers.tsx web/src/app/layout.tsx
git commit -m "feat: design foundation — CSS variables, semantic Tailwind tokens, dark-first theming"
```

---

## Task 2: Sidebar Redesign

**Files:**
- Rewrite: `web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Rewrite sidebar with Lucide icons, search bar, and avatar**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, BookOpen, Search, Sparkles } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/ai", label: "AI Chat", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleChatPanel } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="flex h-full w-60 flex-col border-r" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 p-4">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ background: "var(--gradient-logo)" }}
        >
          S
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Second Brain</span>
      </div>

      <div className="px-3 pb-4">
        <button
          onClick={() => {
            const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            document.dispatchEvent(event);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-faint)" }}
        >
          <Search size={14} />
          <span>Search...</span>
          <kbd
            className="ml-auto rounded px-1.5 py-0.5 text-[10px]"
            style={{ backgroundColor: "var(--elevated)", color: "var(--text-muted)" }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium nav-item",
                active && "!bg-[var(--accent-muted)]"
              )}
              style={{
                color: active ? "var(--accent-light)" : "var(--text-secondary)",
              }}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="flex items-center gap-2 px-4 py-3 text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ background: "var(--gradient-logo)" }}
        >
          M
        </div>
        <span>mlawali</span>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/layout/sidebar.tsx
git commit -m "feat: sidebar redesign — Lucide icons, search bar, amber avatar, hover transitions"
```

---

## Task 3: Auth Pages Redesign

**Files:**
- Rewrite: `web/src/app/(auth)/login/page.tsx`
- Rewrite: `web/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Rewrite login page**

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
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-[10px] p-8 fade-in"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-center gap-2 pb-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "var(--gradient-logo)" }}
          >
            S
          </div>
          <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Second Brain</span>
        </div>

        <h1 className="text-center text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Sign In</h1>

        {errorMsg && (
          <p className="text-center text-sm" style={{ color: "var(--destructive)" }}>{errorMsg}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm input-base"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm input-base"
          required
        />
        <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-sm btn-accent">
          Sign In
        </button>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          No account?{" "}
          <a href="/register" style={{ color: "var(--accent-light)" }} className="hover:underline">
            Register
          </a>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite register page**

Same structure as login but with "Create Account" title, password minLength hint, and reversed link text ("Already have an account? Sign in"). Use the same styling classes.

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
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-[10px] p-8 fade-in"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-center gap-2 pb-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "var(--gradient-logo)" }}
          >
            S
          </div>
          <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Second Brain</span>
        </div>

        <h1 className="text-center text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Create Account</h1>

        {errorMsg && (
          <p className="text-center text-sm" style={{ color: "var(--destructive)" }}>{errorMsg}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm input-base"
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm input-base"
          minLength={8}
          required
        />
        <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-sm btn-accent">
          Register
        </button>
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--accent-light)" }} className="hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\(auth\)/
git commit -m "feat: auth pages redesign — dark cards, gradient buttons, amber accents"
```

---

## Task 4: Notes List & Note List Component

**Files:**
- Rewrite: `web/src/components/notes/note-list.tsx`
- Rewrite: `web/src/app/(app)/notes/page.tsx`

- [ ] **Step 1: Rewrite note-list.tsx**

```tsx
"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

interface NoteListProps {
  notes: {
    id: string;
    title: string;
    contentPlain: string;
    isSensitive?: boolean;
    tags: { id: string; name: string; color: string }[];
    updatedAt: string;
  }[];
}

const TAG_COLORS: Record<string, string> = {
  "#d97706": "tag-amber",
  "#2563eb": "tag-blue",
  "#16a34a": "tag-green",
  "#ef4444": "tag-red",
  "#8b5cf6": "tag-purple",
  "#6366f1": "tag-purple",
};

function getTagClass(color: string): string {
  return TAG_COLORS[color] || "tag-amber";
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 fade-in">
        <p style={{ color: "var(--text-muted)" }}>No notes yet.</p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-faint)" }}>
          Create your first note to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 fade-in">
      {notes.map((note) => (
        <Link
          key={note.id}
          href={`/notes/${note.id}`}
          className="block rounded-[10px] p-4 card-hover"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {note.isSensitive && <Lock size={12} style={{ color: "var(--destructive)" }} />}
              {note.title || "Untitled"}
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              {timeAgo(note.updatedAt)}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
            {note.contentPlain}
          </p>
          {note.tags.length > 0 && (
            <div className="mt-2.5 flex gap-1.5">
              {note.tags.map((tag) => (
                <span key={tag.id} className={`tag ${getTagClass(tag.color)}`}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite notes page**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, List, Globe } from "lucide-react";
import { useNotes, useCreateNote } from "@/hooks/use-notes";
import { NoteList } from "@/components/notes/note-list";
import { NoteGraph } from "@/components/notes/note-graph";

export default function NotesPage() {
  const router = useRouter();
  const { data, isLoading } = useNotes();
  const createNote = useCreateNote();
  const [view, setView] = useState<"list" | "graph">("list");

  async function handleCreate() {
    const result = await createNote.mutateAsync({ title: "Untitled" });
    router.push(`/notes/${result.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Notes</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-faint)" }}>
            {data?.total ?? 0} notes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-surface ${view === "list" ? "!border-[var(--border-hover)]" : ""}`}
          >
            <List size={14} /> List
          </button>
          <button
            onClick={() => setView("graph")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs btn-surface ${view === "graph" ? "!border-[var(--border-hover)]" : ""}`}
          >
            <Globe size={14} /> Graph
          </button>
          <button onClick={handleCreate} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] btn-accent">
            <Plus size={14} /> New Note
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : view === "graph" ? (
        <NoteGraph />
      ) : (
        <NoteList notes={data?.data ?? []} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/notes/note-list.tsx web/src/app/\(app\)/notes/page.tsx
git commit -m "feat: notes list redesign — styled cards, tags, timestamps, sensitive indicator"
```

---

## Task 5: Note Editor Page

**Files:**
- Rewrite: `web/src/app/(app)/notes/[id]/page.tsx`
- Rewrite: `web/src/components/editor/tiptap-editor.tsx`

- [ ] **Step 1: Rewrite Tiptap editor with styled toolbar**

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect } from "react";
import { Bold, Italic, Heading1, Heading2, List as ListIcon, Code } from "lucide-react";
import { cn } from "@/lib/utils";

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
      StarterKit.configure({ codeBlock: false }),
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
        class: "prose-editor ProseMirror",
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
    <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="flex gap-0.5 p-2" style={{ backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold size={15} />} />
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic size={15} />} />
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={15} />} />
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={15} />} />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<ListIcon size={15} />} />
        <ToolbarBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={<Code size={15} />} />
      </div>
      <div style={{ backgroundColor: "var(--background)" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarBtn({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 transition-colors duration-150",
      )}
      style={{
        color: active ? "var(--accent-light)" : "var(--text-secondary)",
        backgroundColor: active ? "var(--accent-muted)" : "transparent",
      }}
    >
      {icon}
    </button>
  );
}
```

- [ ] **Step 2: Rewrite note editor page**

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

  if (isLoading) return <p className="p-8" style={{ color: "var(--text-muted)" }}>Loading...</p>;
  if (!note) return <p className="p-8" style={{ color: "var(--destructive)" }}>Note not found</p>;

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="mb-6 w-full border-none bg-transparent text-[28px] font-semibold focus:outline-none"
        style={{ color: "var(--text-primary)" }}
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

- [ ] **Step 3: Commit**

```bash
git add web/src/components/editor/tiptap-editor.tsx web/src/app/\(app\)/notes/\[id\]/page.tsx
git commit -m "feat: editor redesign — Lucide toolbar, prose theming, styled title input"
```

---

## Task 6: Journal Pages

**Files:**
- Rewrite: `web/src/app/(app)/journal/page.tsx`
- Rewrite: `web/src/app/(app)/journal/[date]/page.tsx`
- Rewrite: `web/src/components/journal/mood-picker.tsx`

- [ ] **Step 1: Rewrite mood-picker.tsx**

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
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}:</span>
      <div className="flex gap-1">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(value === mood.value ? null : mood.value)}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: value === mood.value ? "var(--accent)" : "var(--surface)",
              color: value === mood.value ? "white" : "var(--text-secondary)",
              border: `1px solid ${value === mood.value ? "var(--accent)" : "var(--border)"}`,
            }}
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

- [ ] **Step 2: Rewrite journal list page**

```tsx
"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useJournalEntries } from "@/hooks/use-journal";

export default function JournalPage() {
  const today = new Date().toISOString().split("T")[0];
  const { data, isLoading } = useJournalEntries();

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Journal</h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-faint)" }}>
            {data?.total ?? 0} entries
          </p>
        </div>
        <Link href={`/journal/${today}`} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] btn-accent">
          Today
        </Link>
      </div>
      {isLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {(data?.data ?? []).map((entry) => (
            <Link
              key={entry.id}
              href={`/journal/${entry.date.split("T")[0]}`}
              className="block rounded-[10px] p-4 card-hover"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {entry.date.split("T")[0]}
                  </span>
                  <Lock size={12} style={{ color: "var(--destructive)", opacity: 0.6 }} />
                </div>
                <div className="flex gap-3 text-[11px]" style={{ color: "var(--text-faint)" }}>
                  {entry.mood && <span>Mood: {entry.mood}/5</span>}
                  {entry.energy && <span>Energy: {entry.energy}/5</span>}
                </div>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                {entry.contentPlain}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite journal entry editor page**

```tsx
"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { Lock } from "lucide-react";
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
        await createEntry.mutateAsync({ date, mood: mood ?? undefined });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  const handleEnergyChange = useCallback(
    async (energy: number | null) => {
      if (entry) {
        updateEntry.mutate({ date, energy });
      } else {
        await createEntry.mutateAsync({ date, energy: energy ?? undefined });
      }
    },
    [date, entry, updateEntry, createEntry]
  );

  if (isLoading) return <p className="p-8" style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>{date}</h1>
        <Lock size={14} style={{ color: "var(--destructive)", opacity: 0.5 }} />
      </div>
      <div className="mb-6 flex gap-6">
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

- [ ] **Step 4: Commit**

```bash
git add web/src/components/journal/mood-picker.tsx web/src/app/\(app\)/journal/
git commit -m "feat: journal redesign — styled cards, amber mood picker, sensitive indicator"
```

---

## Task 7: Search Page & Results

**Files:**
- Rewrite: `web/src/app/(app)/search/page.tsx`
- Rewrite: `web/src/components/search/search-results.tsx`

- [ ] **Step 1: Rewrite search-results.tsx**

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
    return <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No results found.</p>;
  }

  return (
    <div className="flex flex-col gap-2 fade-in">
      {results.map((r) => {
        const href = r.type === "note" ? `/notes/${r.id}` : `/journal/${r.title}`;
        return (
          <Link
            key={`${r.type}-${r.id}`}
            href={href}
            className="block rounded-[10px] p-3 card-hover"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: "var(--elevated)", color: "var(--text-faint)" }}
              >
                {r.type === "note" ? "Note" : "Journal"}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {r.title || "Untitled"}
              </span>
            </div>
            <p className="mt-1 text-[13px] line-clamp-2" style={{ color: "var(--text-muted)" }}>{r.snippet}</p>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite search page**

```tsx
"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { SearchResults } from "@/components/search/search-results";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("combined");
  const { data, isLoading } = useSearch(query, mode);

  const modes = ["combined", "fulltext", "semantic"] as const;

  return (
    <div className="mx-auto max-w-3xl p-8 fade-in">
      <h1 className="mb-6 text-[22px] font-semibold" style={{ color: "var(--text-primary)" }}>Search</h1>

      <div className="mb-4 flex items-center gap-2 rounded-[10px] px-3 py-2.5 input-base">
        <SearchIcon size={16} style={{ color: "var(--text-faint)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your knowledge base..."
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      <div className="mb-6 flex gap-1">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: mode === m ? "var(--accent-muted)" : "transparent",
              color: mode === m ? "var(--accent-light)" : "var(--text-muted)",
            }}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {isLoading && <p style={{ color: "var(--text-muted)" }}>Searching...</p>}
      {data && <SearchResults results={data.data} />}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/search/search-results.tsx web/src/app/\(app\)/search/page.tsx
git commit -m "feat: search redesign — icon input, segmented mode selector, styled results"
```

---

## Task 8: AI Chat

**Files:**
- Rewrite: `web/src/app/(app)/ai/page.tsx`
- Rewrite: `web/src/components/ai/chat-panel.tsx`
- Rewrite: `web/src/components/ai/chat-message.tsx`

- [ ] **Step 1: Rewrite chat-message.tsx**

```tsx
import Link from "next/link";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  return (
    <div className={`mb-4 ${role === "user" ? "flex justify-end" : ""}`}>
      <div
        className="inline-block max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
        style={
          role === "user"
            ? { background: "var(--gradient-accent)", color: "white", borderBottomRightRadius: "4px" }
            : { backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderBottomLeftRadius: "4px" }
        }
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sources.map((s) => {
            const href = s.type === "note" ? `/notes/${s.id}` : `/journal/${s.title}`;
            return (
              <Link
                key={`${s.type}-${s.id}`}
                href={href}
                className="rounded-md px-2 py-0.5 text-[11px] transition-colors duration-150"
                style={{
                  backgroundColor: "var(--accent-muted)",
                  color: "var(--accent)",
                  border: "1px solid rgba(217,119,6,0.2)",
                }}
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

- [ ] **Step 2: Rewrite chat-panel.tsx**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
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
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Sparkles size={32} style={{ color: "var(--accent)", opacity: 0.4 }} />
            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              Ask anything about your notes and journal.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
        {isLoading && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            <span className="inline-flex gap-1">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-pulse" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your second brain..."
          className="flex-1 rounded-[10px] px-4 py-2.5 text-sm input-base"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] btn-accent disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite AI page**

```tsx
import { Sparkles } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";

export default function AIPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-6" style={{ borderBottom: "1px solid var(--border)" }}>
        <Sparkles size={18} style={{ color: "var(--accent)" }} />
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>AI Chat</h1>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Ask questions about your notes</span>
      </div>
      <div className="flex-1">
        <ChatPanel />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/ai/ web/src/app/\(app\)/ai/page.tsx
git commit -m "feat: AI chat redesign — gradient bubbles, source pills, sparkles empty state"
```

---

## Task 9: Command Palette & Note Graph

**Files:**
- Rewrite: `web/src/components/layout/command-palette.tsx`
- Modify: `web/src/components/notes/note-graph.tsx`

- [ ] **Step 1: Rewrite command palette**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl shadow-2xl fade-in"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <Search size={16} style={{ color: "var(--text-faint)" }} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type + to create..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(data?.data ?? []).map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => handleSelect(r)}
              className="w-full px-4 py-2.5 text-left transition-colors duration-100"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
                {r.type === "note" ? "Note" : "Journal"}
              </span>
              <p className="text-sm">{r.title || "Untitled"}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify note-graph.tsx — amber-themed nodes**

Read the existing file and change:
- Node `background` from `"#6366f1"` to `"#d97706"`
- Edge `stroke` from `"#6366f1"` to `"#d97706"`
- Add `border: "1px solid var(--border)"` to the container div

- [ ] **Step 3: Commit**

```bash
git add web/src/components/layout/command-palette.tsx web/src/components/notes/note-graph.tsx
git commit -m "feat: command palette blur overlay, amber graph nodes"
```

---

## Task 10: App Layout Final Pass

**Files:**
- Modify: `web/src/app/(app)/layout.tsx`

- [ ] **Step 1: Update app layout — ensure themed background**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";

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
    <div className="flex h-screen" style={{ backgroundColor: "var(--background)" }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <CommandPalette />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/layout.tsx
git commit -m "feat: app layout — themed background, command palette integration"
```

---

## Summary

**10 tasks, ~20 files** covering the full visual redesign:

| Task | What Changes |
|------|-------------|
| 1 | Design foundation — CSS vars, Tailwind tokens, utils, theming |
| 2 | Sidebar — Lucide icons, search bar, avatar |
| 3 | Auth pages — dark cards, gradient buttons |
| 4 | Notes list — styled cards, tags, timestamps |
| 5 | Note editor — Lucide toolbar, prose theme |
| 6 | Journal — styled list, amber mood picker |
| 7 | Search — icon input, mode selector |
| 8 | AI Chat — gradient bubbles, source pills, sparkles |
| 9 | Command palette — blur overlay, amber graph |
| 10 | App layout — final wiring |
