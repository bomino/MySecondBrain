import { useQuery } from "@tanstack/react-query";

interface AIStatus {
  sidecar: boolean;
  pendingJobs: number;
}

export function useAIStatus() {
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: async () => {
      const res = await fetch("/api/v1/ai/status");
      if (!res.ok) return { sidecar: false, pendingJobs: 0 };
      return res.json() as Promise<AIStatus>;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
