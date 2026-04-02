# Second Brain — Visual Redesign Spec

## Overview

Transform the bare-bones functional UI into a polished, dark-first "Dark & Warm" aesthetic. Neutral dark backgrounds with amber/orange accent. Lucide icons, micro-animations, layered depth, and proper component primitives via shadcn/ui.

**Scope:** Visual overhaul of all existing Tier 1 pages and components. No new features — purely cosmetic and UX polish.

---

## Design System

### Color Tokens (CSS Variables)

Dark mode (default):

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0a0a0a` (neutral-950) | Page background |
| `--surface` | `#171717` (neutral-900) | Cards, sidebar, panels |
| `--elevated` | `#262626` (neutral-800) | Hover states, inputs, elevated surfaces |
| `--border` | `#262626` (neutral-800) | Default borders |
| `--border-hover` | `#404040` (neutral-700) | Borders on hover |
| `--accent` | `#d97706` (amber-600) | Primary accent — buttons, active states |
| `--accent-hover` | `#b45309` (amber-700) | Accent hover |
| `--accent-light` | `#fbbf24` (amber-400) | Active text, highlights |
| `--accent-muted` | `rgba(217,119,6,0.08)` | Accent backgrounds (tags, active nav) |
| `--text-primary` | `#fafafa` (neutral-50) | Headings, primary text |
| `--text-secondary` | `#a3a3a3` (neutral-400) | Body text, descriptions |
| `--text-muted` | `#737373` (neutral-500) | Timestamps, placeholders |
| `--text-faint` | `#525252` (neutral-600) | Disabled, hint text |
| `--destructive` | `#ef4444` (red-500) | Delete, sensitive indicators |
| `--success` | `#22c55e` (green-500) | Success states |

Light mode:

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#fafafa` (neutral-50) | Page background |
| `--surface` | `#ffffff` | Cards, panels |
| `--elevated` | `#f5f5f5` (neutral-100) | Hover, inputs |
| `--border` | `#e5e5e5` (neutral-200) | Borders |
| `--border-hover` | `#d4d4d4` (neutral-300) | Border hover |
| `--accent` | `#d97706` (amber-600) | Same accent |
| `--accent-hover` | `#b45309` (amber-700) | Same |
| `--accent-light` | `#d97706` (amber-600) | Active text in light mode |
| `--accent-muted` | `rgba(217,119,6,0.08)` | Same |
| `--text-primary` | `#0a0a0a` (neutral-950) | Headings |
| `--text-secondary` | `#525252` (neutral-600) | Body |
| `--text-muted` | `#737373` (neutral-500) | Timestamps |
| `--text-faint` | `#a3a3a3` (neutral-400) | Disabled |

### Typography

- **Font family:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- **Heading sizes:** 22px (page title), 16px (section), 14px (card title)
- **Body:** 13-14px
- **Small/meta:** 11-12px
- **Font weights:** 400 (body), 500 (card titles, nav items), 600 (page titles, logo)

### Spacing

Use Tailwind's default scale. Key recurring values:
- Page padding: `32px` (p-8)
- Card padding: `16px` (p-4)
- Section gap: `24px` (gap-6)
- Card gap: `8px` (gap-2)
- Sidebar width: `240px` (w-60)

### Border Radius

- Cards, inputs, panels: `10px` (rounded-[10px] or rounded-lg)
- Buttons: `8px` (rounded-lg)
- Tags/badges: `6px` (rounded-md)
- Avatars: `50%` (rounded-full)
- Logo icon: `8px`

### Shadows

Minimal shadows in dark mode (depth comes from background color layers). Light mode uses subtle shadows:
- Card: `0 1px 3px rgba(0,0,0,0.08)`
- Elevated: `0 4px 12px rgba(0,0,0,0.1)`
- Modal/overlay: `0 8px 30px rgba(0,0,0,0.2)`

---

## Component Redesigns

### 1. Sidebar (`components/layout/sidebar.tsx`)

**Current:** Gray background, emoji icons, basic links.

**New:**
- Background: `var(--background)`, right border `var(--border)`
- Logo: 28px rounded square with amber→orange gradient, white "S" letter, 600 weight. "Second Brain" label next to it.
- Search bar: `var(--surface)` background, 1px border, magnifying glass icon left, `⌘K` badge right. Placeholder "Search..." in `var(--text-faint)`.
- Nav items: Lucide icons (16px, stroke-2) + label. Active item: `var(--accent-muted)` background, `var(--accent-light)` text. Inactive: `var(--text-secondary)`, hover `var(--surface)` background. 8px padding, 8px border-radius.
- User section: Bottom of sidebar, border-top. Avatar circle (26px, amber gradient) with initial. Email/username in `var(--text-secondary)`.
- Transition: 150ms background on nav hover.

**Icons mapping:**
- Notes → `FileText`
- Journal → `BookOpen`
- Search → `Search`
- AI Chat → `Sparkles`

### 2. Login & Register Pages (`app/(auth)/login/page.tsx`, `register/page.tsx`)

**Current:** Centered white form, basic inputs.

**New:**
- Full-page `var(--background)` background.
- Centered card (max-w-sm): `var(--surface)` background, 1px `var(--border)`, 10px radius.
- Logo at top of card (same gradient logo + "Second Brain" text).
- Inputs: `var(--elevated)` background, 1px `var(--border)`, 10px radius, `var(--text-primary)` text, placeholder in `var(--text-faint)`. Focus: `var(--accent)` border ring (2px).
- Submit button: `linear-gradient(135deg, var(--accent), var(--accent-hover))`, white text, 8px radius, full width.
- Links: `var(--accent-light)` color.
- Error text: `var(--destructive)`.

### 3. Notes List Page (`app/(app)/notes/page.tsx`)

**Current:** Simple title + button + flat list.

**New:**
- Header: "Notes" title (22px, 600 weight) + subtitle count in `var(--text-faint)`. Right side: List/Graph toggle buttons (`var(--surface)` bg, icon + label) + "New Note" gradient button (amber, `+` icon).
- Note cards: `var(--surface)` background, 1px `var(--border)`, 10px radius. On hover: border transitions to `var(--border-hover)` (150ms). Content: title (14px, 500), preview (13px, `var(--text-muted)`), tags row. Timestamp top-right in `var(--text-faint)`.
- Tags: Colored backgrounds at 8% opacity with matching text. Standard tag colors: amber (default), blue, green, red, purple.
- Sensitive note indicator: Small lock icon (Lucide `Lock`, 12px) next to title in `var(--destructive)`.
- Empty state: Centered message with muted text + CTA button.

### 4. Note Editor Page (`app/(app)/notes/[id]/page.tsx`)

**Current:** Plain input + Tiptap with basic toolbar.

**New:**
- Title input: No visible border, 28px font, 600 weight, `var(--text-primary)`. Placeholder in `var(--text-faint)`.
- Toolbar: `var(--surface)` background, 1px bottom border. Icon buttons (Lucide) with `var(--text-secondary)`, active state `var(--accent-light)` + `var(--accent-muted)` background. 6px radius buttons.
- Editor area: Clean prose styling. `var(--text-primary)` for body, `var(--text-secondary)` for code blocks (with `var(--elevated)` background). Links in `var(--accent-light)`. Min-height 60vh.
- Backlinks section: Below editor, collapsed by default. Header "Backlinks" with count badge. List of linking notes as small cards.

### 5. Journal Pages (`app/(app)/journal/page.tsx`, `[date]/page.tsx`)

**Current:** Basic list, plain mood picker.

**New:**
- Journal list: Same card treatment as notes but date as primary text (16px, 500 weight). Mood/energy shown as subtle colored dots or numbers.
- "Today" button: Gradient amber, same as "New Note".
- Entry editor: Same Tiptap editor as notes. Date as large title (22px). Mood/energy pickers: horizontal button group, `var(--surface)` inactive, `var(--accent)` active with smooth transition. Labels: "Mood" and "Energy" in `var(--text-muted)`.
- Sensitive badge: Small `var(--destructive)` lock icon near date indicating local-only AI processing.

### 6. Search Page (`app/(app)/search/page.tsx`)

**Current:** Plain input + dropdown + results.

**New:**
- Search input: Large (16px font), full-width, `var(--surface)` bg, `var(--border)`, focus ring `var(--accent)`. Search icon left.
- Mode selector: Segmented control (combined/fulltext/semantic) using `var(--surface)` inactive, `var(--accent-muted)` + `var(--accent-light)` active.
- Results: Same card treatment as notes list. Result type badge ("Note" / "Journal") in `var(--text-faint)`.

### 7. AI Chat Page (`app/(app)/ai/page.tsx`, `components/ai/chat-panel.tsx`)

**Current:** Basic bubbles, plain input.

**New:**
- Header: Sparkles icon in `var(--accent)` + "AI Chat" title + subtitle in `var(--text-muted)`.
- User messages: `linear-gradient(135deg, var(--accent), var(--accent-hover))` background, white text, 14px rounded corners (right-aligned, bottom-right corner smaller).
- Assistant messages: `var(--surface)` background, 1px `var(--border)`, `var(--text-secondary)` text. Source citation pills: `var(--accent-muted)` bg, `var(--accent)` border, `var(--accent)` text. Clickable.
- Input: Full-width `var(--surface)` with border, 10px radius. Send button: gradient amber circle (38px), arrow icon.
- "Thinking..." state: Animated three dots in `var(--text-muted)`.
- Empty state: Centered sparkles icon + "Ask anything about your notes and journal" in `var(--text-muted)`.

### 8. Command Palette (`components/layout/command-palette.tsx`)

**Current:** Basic modal with search and results.

**New:**
- Overlay: `rgba(0,0,0,0.6)` backdrop with `backdrop-filter: blur(4px)`.
- Modal: `var(--surface)` bg, 1px `var(--border)`, 12px radius, shadow-2xl. Max-w-lg, centered at 20vh from top.
- Input: No outer border, large text (16px), bottom border separator. Search icon left.
- Results: Hover `var(--elevated)`, type badge, title. Keyboard nav indicators (arrow keys hint at bottom).

### 9. Note Graph (`components/notes/note-graph.tsx`)

**Current:** Hardcoded indigo nodes.

**New:**
- Node color: `var(--accent)` background (#d97706), white text, 8px radius.
- Edge color: `var(--accent)` at 40% opacity, animated.
- Background: `var(--background)`.
- Controls/minimap: Styled with `var(--surface)` and `var(--border)`.

### 10. Providers & Theme (`components/providers.tsx`)

**Current:** Basic class toggle.

**New:**
- ThemeProvider applies CSS variables to `:root` based on theme state.
- Smooth 200ms transition on `background-color` and `color` when theme switches.
- Default to dark mode.

---

## Animations & Transitions

| Element | Animation | Duration |
|---------|-----------|----------|
| Nav item hover | Background fade in | 150ms ease |
| Card hover | Border color shift | 150ms ease |
| Button hover | Slight brightness increase | 150ms ease |
| Input focus | Accent ring appears | 150ms ease |
| Page mount | Fade in + slight upward shift | 200ms ease-out |
| Chat message | Fade in + slide up | 200ms ease-out |
| Command palette open | Fade in + scale from 0.98 | 150ms ease-out |
| Command palette close | Fade out | 100ms ease-in |
| Theme switch | Background/color transition | 200ms ease |
| Sidebar collapse | Width transition | 200ms ease |

No spring physics or complex choreography. Simple CSS transitions only — no additional animation library needed.

---

## Infrastructure Changes

### shadcn/ui Setup

Initialize shadcn/ui with the "neutral" base and custom amber accent. This gives us:
- `components.json` configuration
- `lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
- CSS variable-based theming in `globals.css`

shadcn components to install:
- `button` (primary/secondary/ghost/destructive variants)
- `input`
- `card`
- `badge`
- `dialog` (for command palette)
- `separator`
- `tooltip`
- `avatar`

### Tailwind Config Extension

Extend the Tailwind theme to reference CSS variables:

```
colors: {
  background: "var(--background)",
  surface: "var(--surface)",
  elevated: "var(--elevated)",
  border: "var(--border)",
  accent: { DEFAULT: "var(--accent)", light: "var(--accent-light)", muted: "var(--accent-muted)" },
  ...
}
```

### Icon Migration

Replace all emoji icons with Lucide React icons:
- `lucide-react` is already installed but unused
- Consistent 16px size in nav, 14px in buttons, 18px in page headers
- stroke-width: 2

### Global CSS (`globals.css`)

Replace the single `@import "tailwindcss"` with:
- Tailwind imports
- CSS variable definitions for dark/light themes under `:root` and `.light`
- Base styles (body background, text color, selection color)
- Prose customizations for Tiptap editor
- Transition utilities

---

## Files to Modify

| File | Change |
|------|--------|
| `web/src/app/globals.css` | Full rewrite — CSS variables, theme, base styles |
| `web/tailwind.config.ts` | Extend with semantic color tokens |
| `web/src/components/layout/sidebar.tsx` | Full rewrite — icons, search bar, avatar, styling |
| `web/src/components/layout/command-palette.tsx` | Restyle — blur overlay, styled modal |
| `web/src/app/(auth)/login/page.tsx` | Restyle — dark card, gradient button, styled inputs |
| `web/src/app/(auth)/register/page.tsx` | Same treatment as login |
| `web/src/app/(app)/layout.tsx` | Add command palette, ensure dark bg |
| `web/src/app/(app)/notes/page.tsx` | Restyle — header, cards, tags, graph toggle |
| `web/src/app/(app)/notes/[id]/page.tsx` | Restyle — title, toolbar, editor prose |
| `web/src/components/notes/note-list.tsx` | Restyle — cards, tags, hover, sensitive indicator |
| `web/src/components/notes/note-graph.tsx` | Restyle — amber nodes, themed controls |
| `web/src/app/(app)/journal/page.tsx` | Restyle — cards, date display |
| `web/src/app/(app)/journal/[date]/page.tsx` | Restyle — mood picker, editor |
| `web/src/components/journal/mood-picker.tsx` | Restyle — amber active state |
| `web/src/app/(app)/search/page.tsx` | Restyle — large input, segmented mode, results |
| `web/src/components/search/search-results.tsx` | Restyle — card treatment |
| `web/src/app/(app)/ai/page.tsx` | Restyle — header |
| `web/src/components/ai/chat-panel.tsx` | Restyle — input, send button, empty state |
| `web/src/components/ai/chat-message.tsx` | Restyle — gradient user bubbles, source pills |
| `web/src/components/editor/tiptap-editor.tsx` | Restyle — toolbar icons, prose theme |
| `web/src/components/providers.tsx` | CSS variable-based theme switching |
| `web/src/stores/ui-store.ts` | Default theme to "dark" |
| `web/src/app/layout.tsx` | Add `dark` class to html by default |

**New files:**
- `web/components.json` (shadcn/ui config)
- `web/src/lib/utils.ts` (cn helper)
- `web/src/components/ui/*` (shadcn primitives: button, input, card, badge, dialog, separator, tooltip, avatar)

---

## Out of Scope

- New features or functionality
- Mobile-specific layouts (responsive already handled by existing flexbox)
- Custom fonts (system fonts are fine)
- Animation libraries (framer-motion, react-spring) — CSS transitions only
- Accessibility audit (separate effort)
