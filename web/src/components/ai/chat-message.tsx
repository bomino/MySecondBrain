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
