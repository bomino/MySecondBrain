"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, FileText, BookOpen, Search, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsHelp } from "@/components/layout/shortcuts-help";

const MOBILE_NAV = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/ai", label: "AI", icon: Sparkles },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  useKeyboardShortcuts(() => setHelpOpen((prev) => !prev));

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 dialog-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 h-full w-60">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 md:hidden"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-1.5"
            style={{ color: "var(--text-secondary)" }}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Second Brain" className="h-6 w-6 rounded-md object-contain" />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Second Brain
            </span>
          </div>
        </div>

        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden"
          style={{ backgroundColor: "var(--surface)", borderTop: "1px solid var(--border)" }}
        >
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors duration-150"
                style={{
                  color: active ? "var(--accent-light)" : "var(--text-faint)",
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <CommandPalette />
    </div>
  );
}
