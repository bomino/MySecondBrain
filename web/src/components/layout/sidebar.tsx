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
