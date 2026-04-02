import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toast-store";

interface JournalEntry {
  id: string;
  date: string;
  contentPlain: string;
  mood: number | null;
  energy: number | null;
  updatedAt: string;
}

interface JournalDetail extends JournalEntry {
  content: Record<string, unknown>;
  isSensitive: boolean;
  tags: { id: string; name: string; color: string }[];
}

export function useJournalEntries(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["journal", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.from) searchParams.set("from", params.from);
      if (params?.to) searchParams.set("to", params.to);
      const res = await fetch(`/api/v1/journal?${searchParams}`);
      return res.json() as Promise<{ data: JournalEntry[]; total: number }>;
    },
  });
}

export function useJournalEntry(date: string) {
  return useQuery({
    queryKey: ["journal", date],
    queryFn: async () => {
      const res = await fetch(`/api/v1/journal/${date}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load entry");
      return res.json() as Promise<JournalDetail>;
    },
    enabled: !!date,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { date: string; content?: unknown; mood?: number; energy?: number }) => {
      const res = await fetch("/api/v1/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["journal"] }),
    onError: () => toast("Failed to save journal entry", "error"),
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, ...data }: { date: string; content?: unknown; mood?: number | null; energy?: number | null }) => {
      const res = await fetch(`/api/v1/journal/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      queryClient.invalidateQueries({ queryKey: ["journal", vars.date] });
    },
    onError: () => toast("Failed to save journal entry", "error"),
  });
}

export function useJournalStreaks() {
  return useQuery({
    queryKey: ["journal-streaks"],
    queryFn: async () => {
      const res = await fetch("/api/v1/journal/streaks");
      if (!res.ok) return { currentStreak: 0, longestStreak: 0, totalEntries: 0 };
      return res.json() as Promise<{ currentStreak: number; longestStreak: number; totalEntries: number }>;
    },
  });
}
