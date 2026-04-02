import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";

interface AppSettings {
  aiRoutingMode: string;
  anthropicApiKey: string;
  ollamaBaseUrl: string;
  chatModelCloud: string;
  chatModelLocal: string;
  embeddingModel: string;
  hasApiKeyOverride: boolean;
  hasEnvApiKey: boolean;
  autoTagEnabled: boolean;
  autoTagAutoApply: boolean;
  defaultNoteSensitive: boolean;
  defaultSearchMode: string;
  toastsEnabled: boolean;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/v1/settings");
      if (!res.ok) return null;
      return res.json() as Promise<AppSettings>;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, string | boolean | undefined>) => {
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast("Settings saved", "success");
    },
    onError: () => toast("Failed to save settings", "error"),
  });
}
