import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";

interface Template {
  id: string;
  name: string;
  content?: Record<string, unknown>;
  createdAt: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/v1/templates");
      if (!res.ok) return [];
      return res.json() as Promise<Template[]>;
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; content: unknown }) => {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json() as Promise<Template>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast("Template saved", "success");
    },
    onError: () => toast("Failed to save template", "error"),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ["template", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/templates/${id}`);
      if (!res.ok) return null;
      return res.json() as Promise<Template>;
    },
    enabled: !!id,
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast("Template deleted", "success");
    },
    onError: () => toast("Failed to delete template", "error"),
  });
}
