"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center dialog-overlay"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 dialog-content"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle
              size={20}
              style={{ color: destructive ? "var(--destructive)" : "var(--accent)" }}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {description}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm btn-surface"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{
              backgroundColor: destructive ? "var(--destructive)" : "var(--accent)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
