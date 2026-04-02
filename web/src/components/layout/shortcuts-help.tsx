"use client";

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["N"], description: "Go to Notes" },
  { keys: ["J"], description: "Go to Journal" },
  { keys: ["/"], description: "Go to Search" },
  { keys: ["?"], description: "Show this help" },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center dialog-overlay"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 dialog-content"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Keyboard Shortcuts
        </h2>
        <div className="flex flex-col gap-3">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{description}</span>
              <div className="flex gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex min-w-[24px] items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: "var(--elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg py-2 text-sm btn-surface"
        >
          Close
        </button>
      </div>
    </div>
  );
}
