import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";

interface Suggestion {
  id: string;
  entityType: string;
  entityId: string;
  result: { suggested_tags?: string[] } | null;
  completedAt: string;
}

export function useNoteSuggestions(noteId: string) {
  return useQuery({
    queryKey: ["suggestions", noteId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/ai/suggestions?noteId=${noteId}`);
      if (!res.ok) return [];
      return res.json() as Promise<Suggestion[]>;
    },
    enabled: !!noteId,
    refetchInterval: 10000,
  });
}

export function useAcceptSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai/suggestions/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to accept");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast("Tags applied", "success");
    },
    onError: () => toast("Failed to apply tags", "error"),
  });
}

export function useDismissSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai/suggestions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to dismiss");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
    onError: () => toast("Failed to dismiss suggestion", "error"),
  });
}
