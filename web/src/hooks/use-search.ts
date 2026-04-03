import { useQuery } from "@tanstack/react-query";

interface SearchResult {
  id: string;
  type: "note" | "journal_entry";
  title: string;
  snippet: string;
  rank: number;
}

export function useSearch(query: string, mode = "combined") {
  return useQuery({
    queryKey: ["search", query, mode],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/search?q=${encodeURIComponent(query)}&mode=${mode}`
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<{ data: SearchResult[] }>;
    },
    enabled: query.length >= 2,
  });
}
