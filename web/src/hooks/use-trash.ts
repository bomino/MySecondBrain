import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";

interface TrashItem {
  id: string;
  title: string;
  type: "note" | "journal_entry";
  deletedAt: string;
}

export function useTrash() {
  return useQuery({
    queryKey: ["trash"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notes/trash");
      if (!res.ok) return { notes: [], entries: [] };
      return res.json() as Promise<{ notes: TrashItem[]; entries: TrashItem[] }>;
    },
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/notes/${id}/restore`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to restore");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast("Note restored", "success");
    },
    onError: () => toast("Failed to restore note", "error"),
  });
}

export function useRestoreJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(`/api/v1/journal/${date}/restore`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to restore");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      toast("Journal entry restored", "success");
    },
    onError: () => toast("Failed to restore journal entry", "error"),
  });
}
