import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";

interface Note {
  id: string;
  title: string;
  contentPlain: string;
  tags: { id: string; name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
}

interface NoteDetail extends Note {
  content: Record<string, unknown>;
  parentId: string | null;
  isSensitive: boolean;
  children: { id: string; title: string }[];
}

export function useNotes(params?: { parentId?: string; tag?: string }) {
  return useQuery({
    queryKey: ["notes", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.parentId) searchParams.set("parentId", params.parentId);
      if (params?.tag) searchParams.set("tag", params.tag);
      const res = await fetch(`/api/v1/notes?${searchParams}`);
      const data = await res.json();
      return data as { data: Note[]; total: number };
    },
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/notes/${id}`);
      if (!res.ok) throw new Error("Note not found");
      return res.json() as Promise<NoteDetail>;
    },
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title?: string; content?: unknown; parentId?: string }) => {
      const res = await fetch("/api/v1/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    onError: () => toast("Failed to create note", "error"),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: unknown; tagIds?: string[] }) => {
      const res = await fetch(`/api/v1/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", vars.id] });
    },
    onError: () => toast("Failed to save note", "error"),
  });
}
