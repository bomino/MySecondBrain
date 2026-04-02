"use client";

import Link from "next/link";
import { useJournalEntries } from "@/hooks/use-journal";

export default function JournalPage() {
  const today = new Date().toISOString().split("T")[0];
  const { data, isLoading } = useJournalEntries();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journal</h1>
        <Link
          href={`/journal/${today}`}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          Today
        </Link>
      </div>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map((entry) => (
            <Link
              key={entry.id}
              href={`/journal/${entry.date.split("T")[0]}`}
              className="block rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{entry.date.split("T")[0]}</h3>
                <div className="flex gap-2 text-xs text-gray-500">
                  {entry.mood && <span>Mood: {entry.mood}/5</span>}
                  {entry.energy && <span>Energy: {entry.energy}/5</span>}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{entry.contentPlain}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
