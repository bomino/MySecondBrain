"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, BookOpen, Search, Sparkles, Lightbulb, Sun, Moon, Monitor, Calendar, Trash2, Settings, LogOut, Download } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useUIStore } from "@/stores/ui-store";
import { useAIStatus } from "@/hooks/use-ai-status";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/ai", label: "AI Chat", icon: Sparkles },
  { href: "/digest", label: "Digest", icon: Lightbulb },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, theme, setTheme } = useUIStore();
  const { data: session } = useSession();
  const { data: aiStatus } = useAIStatus();
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    const d = new Date();
    setTodayStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }, []);

  if (!sidebarOpen) return null;

  return (
    <aside className="flex h-full w-60 flex-col border-r" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3 p-4">
        <img src="/logo.png" alt="Second Brain" className="h-14 w-14 rounded-lg object-contain" />
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
          aria-label="Open search (Ctrl+K)"
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

      <div className="flex items-center gap-1 px-1 pb-3">
        {[
          { value: "dark" as const, icon: Moon, label: "Dark" },
          { value: "light" as const, icon: Sun, label: "Light" },
          { value: "system" as const, icon: Monitor, label: "System" },
        ].map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className="flex flex-1 items-center justify-center gap-1 rounded-md py-1 text-[11px] transition-all duration-150"
            style={{
              backgroundColor: theme === value ? "var(--accent-muted)" : "transparent",
              color: theme === value ? "var(--accent-light)" : "var(--text-faint)",
            }}
            aria-label={`Switch to ${label} theme`}
          >
            <Icon size={12} />
            <span>{label}</span>
          </button>
        ))}
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
              {item.href === "/ai" && aiStatus && (
                <span
                  className="ml-auto h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: !aiStatus.sidecar
                      ? "var(--destructive)"
                      : aiStatus.pendingJobs > 0
                        ? "var(--accent)"
                        : "var(--success)",
                  }}
                  title={
                    !aiStatus.sidecar
                      ? "AI unavailable"
                      : aiStatus.pendingJobs > 0
                        ? `${aiStatus.pendingJobs} jobs processing`
                        : "AI ready"
                  }
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <a
          href={`/journal/${todayStr || "today"}`}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium nav-item"
          style={{ color: "var(--text-secondary)" }}
        >
          <Calendar size={16} strokeWidth={2} />
          <span>Today</span>
        </a>
      </div>

      <div className="space-y-0.5 px-3 pb-2">
        <Link href="/trash" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm nav-item" style={{ color: "var(--text-faint)" }}>
          <Trash2 size={15} /> <span>Trash</span>
        </Link>
        <Link href="/export" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm nav-item" style={{ color: "var(--text-faint)" }}>
          <Download size={15} /> <span>Export</span>
        </Link>
        <Link href="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm nav-item" style={{ color: "var(--text-faint)" }}>
          <Settings size={15} /> <span>Settings</span>
        </Link>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-3 text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ background: "var(--gradient-logo)" }}
        >
          {(session?.user?.email?.[0] ?? "U").toUpperCase()}
        </div>
        <span className="flex-1 truncate">{session?.user?.email?.split("@")[0] ?? "user"}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md p-1 transition-colors duration-150"
          style={{ color: "var(--text-faint)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
