import { useQuery } from "@tanstack/react-query";

interface Digest {
  forgotten_relevance: { id: string; title: string; similarity: number }[];
  on_this_day: { id: string; date: string; snippet: string }[];
  orphans: { id: string; title: string; created_at: string }[];
  clusters: { id: string; title: string }[][];
  generated_at: string;
}

export function useDigest() {
  return useQuery({
    queryKey: ["digest"],
    queryFn: async () => {
      const res = await fetch("/api/v1/ai/digest");
      if (!res.ok) return null;
      return res.json() as Promise<Digest>;
    },
    staleTime: 1000 * 60 * 60,
  });
}
