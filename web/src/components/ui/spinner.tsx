export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      style={{ color: "var(--accent)" }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DotsSpinner() {
  return (
    <span className="inline-flex gap-1" style={{ color: "var(--text-faint)" }}>
      <span className="animate-pulse">.</span>
      <span className="animate-pulse" style={{ animationDelay: "150ms" }}>.</span>
      <span className="animate-pulse" style={{ animationDelay: "300ms" }}>.</span>
    </span>
  );
}
