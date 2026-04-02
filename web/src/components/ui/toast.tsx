"use client";

import { useToastStore } from "@/stores/toast-store";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

const ICONS = {
  success: <CheckCircle size={16} style={{ color: "var(--success)" }} />,
  error: <XCircle size={16} style={{ color: "var(--destructive)" }} />,
  info: <Info size={16} style={{ color: "var(--accent)" }} />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg toast-enter"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            minWidth: "280px",
            maxWidth: "400px",
          }}
        >
          {ICONS[t.type]}
          <span className="flex-1 text-sm">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="rounded p-0.5 transition-colors duration-150"
            style={{ color: "var(--text-faint)" }}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
