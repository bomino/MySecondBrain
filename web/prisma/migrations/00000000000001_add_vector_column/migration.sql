-- Add vector extension (already enabled via schema.prisma extensions, but ensure it exists)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to embedding_chunks
ALTER TABLE embedding_chunks ADD COLUMN embedding vector(768);

-- Create HNSW index for fast similarity search
CREATE INDEX embedding_chunks_embedding_idx ON embedding_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Add full-text search index on notes
ALTER TABLE notes ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_plain, ''))) STORED;
CREATE INDEX notes_search_idx ON notes USING gin(search_vector);

-- Add full-text search index on journal entries
ALTER TABLE journal_entries ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content_plain, ''))) STORED;
CREATE INDEX journal_entries_search_idx ON journal_entries USING gin(search_vector);
