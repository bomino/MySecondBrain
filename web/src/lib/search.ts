import { db } from "./db";
import { callSidecar } from "./ai-client";

interface SearchResult {
  id: string;
  type: "note" | "journal_entry";
  title: string;
  snippet: string;
  updatedAt: Date;
  rank: number;
}

export async function fullTextSearch(
  userId: string,
  query: string,
  limit = 20
): Promise<SearchResult[]> {
  const results = await db.$queryRawUnsafe<SearchResult[]>(
    `
    SELECT * FROM (
      SELECT
        id,
        'note' as type,
        title,
        LEFT(content_plain, 200) as snippet,
        updated_at as "updatedAt",
        ts_rank(search_vector, websearch_to_tsquery('english', $1)) as rank
      FROM notes
      WHERE user_id = $2::uuid
        AND deleted_at IS NULL
        AND search_vector @@ websearch_to_tsquery('english', $1)

      UNION ALL

      SELECT
        id,
        'journal_entry' as type,
        TO_CHAR(date, 'YYYY-MM-DD') as title,
        LEFT(content_plain, 200) as snippet,
        updated_at as "updatedAt",
        ts_rank(search_vector, websearch_to_tsquery('english', $1)) as rank
      FROM journal_entries
      WHERE user_id = $2::uuid
        AND deleted_at IS NULL
        AND search_vector @@ websearch_to_tsquery('english', $1)
    ) results
    ORDER BY rank DESC
    LIMIT $3
    `,
    query.trim(),
    userId,
    limit
  );

  return results;
}

export async function semanticSearch(
  userId: string,
  query: string,
  limit = 20
): Promise<SearchResult[]> {
  const embedding = await callSidecar<{ embedding: number[] }>("/embed-query", {
    text: query,
    is_sensitive: false,
  });

  const results = await db.$queryRawUnsafe<
    { entity_type: string; entity_id: string; chunk_text: string; similarity: number }[]
  >(
    `
    SELECT ec.entity_type, ec.entity_id, ec.chunk_text,
           1 - (ec.embedding <=> $1::vector) as similarity
    FROM embedding_chunks ec
    JOIN (
      SELECT id FROM notes WHERE user_id = $3::uuid AND deleted_at IS NULL
      UNION ALL
      SELECT id FROM journal_entries WHERE user_id = $3::uuid AND deleted_at IS NULL
    ) owned ON ec.entity_id = owned.id
    WHERE ec.entity_type IN ('note', 'journal_entry')
    ORDER BY ec.embedding <=> $1::vector
    LIMIT $2
    `,
    JSON.stringify(embedding.embedding),
    limit,
    userId
  );

  const noteIds = results.filter((r) => r.entity_type === "note").map((r) => r.entity_id);
  const journalIds = results.filter((r) => r.entity_type === "journal_entry").map((r) => r.entity_id);

  const [notes, entries] = await Promise.all([
    noteIds.length > 0
      ? db.note.findMany({
          where: { id: { in: noteIds }, userId, deletedAt: null },
          select: { id: true, title: true, updatedAt: true },
        })
      : [],
    journalIds.length > 0
      ? db.journalEntry.findMany({
          where: { id: { in: journalIds }, userId, deletedAt: null },
          select: { id: true, date: true, updatedAt: true },
        })
      : [],
  ]);

  const noteMap = new Map(notes.map((n) => [n.id, n]));
  const journalMap = new Map(entries.map((e) => [e.id, e]));

  return results
    .map((r) => {
      if (r.entity_type === "note") {
        const note = noteMap.get(r.entity_id);
        if (!note) return null;
        return {
          id: note.id,
          type: "note" as const,
          title: note.title,
          snippet: r.chunk_text.slice(0, 200),
          updatedAt: note.updatedAt,
          rank: r.similarity,
        };
      }
      const entry = journalMap.get(r.entity_id);
      if (!entry) return null;
      return {
        id: entry.id,
        type: "journal_entry" as const,
        title: entry.date.toISOString().split("T")[0],
        snippet: r.chunk_text.slice(0, 200),
        updatedAt: entry.updatedAt,
        rank: r.similarity,
      };
    })
    .filter((r): r is SearchResult => r !== null);
}

export async function combinedSearch(
  userId: string,
  query: string,
  limit = 20
): Promise<SearchResult[]> {
  const [ftResults, semResults] = await Promise.all([
    fullTextSearch(userId, query, limit),
    semanticSearch(userId, query, limit).catch(() => []),
  ]);

  const seen = new Set<string>();
  const combined: SearchResult[] = [];

  for (const r of [...ftResults, ...semResults]) {
    const key = `${r.type}:${r.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(r);
    }
  }

  combined.sort((a, b) => b.rank - a.rank);
  return combined.slice(0, limit);
}
