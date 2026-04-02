import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; id: string; title: string }[];
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/v1/ai/conversations");
      if (!res.ok) return [];
      return res.json() as Promise<Conversation[]>;
    },
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const res = await fetch(`/api/v1/ai/conversations/${conversationId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data as { id: string; title: string; messages: ChatMessage[] };
    },
    enabled: !!conversationId,
  });
}

export function useAIChat() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    try {
      const res = await fetch(`/api/v1/ai/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      toast("Failed to load conversation", "error");
    }
  }, []);

  const startNewConversation = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const conv = await res.json();
        setActiveConversationId(conv.id);
        setMessages([]);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        return conv.id as string;
      }
    } catch {
      toast("Failed to create conversation", "error");
    }
    return null;
  }, [queryClient]);

  const sendMessage = useCallback(async (query: string, routingChoice = "local") => {
    let convId = activeConversationId;
    if (!convId) {
      convId = await startNewConversation();
      if (!convId) return;
    }

    const userMsg: ChatMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    await fetch(`/api/v1/ai/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: query }),
    }).catch(() => {});

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, routingChoice }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.answer ?? data.error ?? "No response",
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await fetch(`/api/v1/ai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "assistant",
          content: assistantMsg.content,
          sources: assistantMsg.sources,
        }),
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to get a response. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, startNewConversation, queryClient]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    activeConversationId,
    loadConversation,
    startNewConversation,
  };
}
