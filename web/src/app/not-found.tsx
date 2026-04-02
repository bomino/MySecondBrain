import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
      <div className="flex flex-col items-center gap-4 fade-in">
        <AlertCircle size={48} style={{ color: "var(--accent)", opacity: 0.5 }} />
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Page Not Found
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg px-6 py-2 text-sm btn-accent"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
