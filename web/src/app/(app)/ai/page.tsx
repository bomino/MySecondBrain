import { ChatPanel } from "@/components/ai/chat-panel";

export default function AIPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <p className="text-sm text-gray-500">Ask questions about your notes and journal</p>
      </div>
      <div className="flex-1">
        <ChatPanel />
      </div>
    </div>
  );
}
