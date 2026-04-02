import { Sparkles } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";

export default function AIPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-6" style={{ borderBottom: "1px solid var(--border)" }}>
        <Sparkles size={18} style={{ color: "var(--accent)" }} />
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>AI Chat</h1>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Ask questions about your notes</span>
      </div>
      <div className="flex-1">
        <ChatPanel />
      </div>
    </div>
  );
}
