import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";
import { readSSEStream } from "@/lib/sse-reader";

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
  const messagesRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    fetch(`/api/v1/ai/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: query }),
    }).catch(() => toast("Failed to save message", "error"));

    const recentMessages = messagesRef.current.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, routingChoice, messages: recentMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      await readSSEStream(res, {
        onToken: (text) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + text };
            }
            return updated;
          });
        },
        onSources: (sources) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, sources };
            }
            return updated;
          });
        },
        onDone: () => {},
        onError: (message) => {
          toast(message, "error");
        },
      });

      const finalMessages = messagesRef.current;
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.content) {
        fetch(`/api/v1/ai/conversations/${convId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "assistant",
            content: lastMsg.content,
            sources: lastMsg.sources,
          }),
        }).catch(() => toast("Failed to save response", "error"));
      }

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: "Failed to get a response. Please try again.",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [activeConversationId, startNewConversation, queryClient]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/v1/ai/conversations/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      toast("Conversation deleted", "success");
    } catch {
      toast("Failed to delete conversation", "error");
    }
  }, [activeConversationId, queryClient]);

  const clearAllConversations = useCallback(async () => {
    try {
      await fetch("/api/v1/ai/conversations", { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConversationId(null);
      setMessages([]);
      toast("All conversations cleared", "success");
    } catch {
      toast("Failed to clear conversations", "error");
    }
  }, [queryClient]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    activeConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation,
    clearAllConversations,
  };
}
