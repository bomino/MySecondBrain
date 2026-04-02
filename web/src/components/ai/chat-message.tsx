import Link from "next/link";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  return (
    <div className={`mb-4 ${role === "user" ? "text-right" : ""}`}>
      <div
        className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
          role === "user"
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {sources.map((s) => {
            const href = s.type === "note" ? `/notes/${s.id}` : `/journal/${s.title}`;
            return (
              <Link
                key={`${s.type}-${s.id}`}
                href={href}
                className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300"
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
