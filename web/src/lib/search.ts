import { db } from "./db";

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
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .map((w) => `${w}:*`)
    .join(" & ");

  const results = await db.$queryRawUnsafe<SearchResult[]>(
    `
    SELECT * FROM (
      SELECT
        id,
        'note' as type,
        title,
        LEFT(content_plain, 200) as snippet,
        updated_at as "updatedAt",
        ts_rank(search_vector, to_tsquery('english', $1)) as rank
      FROM notes
      WHERE user_id = $2::uuid
        AND deleted_at IS NULL
        AND search_vector @@ to_tsquery('english', $1)

      UNION ALL

      SELECT
        id,
        'journal_entry' as type,
        TO_CHAR(date, 'YYYY-MM-DD') as title,
        LEFT(content_plain, 200) as snippet,
        updated_at as "updatedAt",
        ts_rank(search_vector, to_tsquery('english', $1)) as rank
      FROM journal_entries
      WHERE user_id = $2::uuid
        AND deleted_at IS NULL
        AND search_vector @@ to_tsquery('english', $1)
    ) results
    ORDER BY rank DESC
    LIMIT $3
    `,
    tsQuery,
    userId,
    limit
  );

  return results;
}
