-- Migration: Add hybrid search support
-- Date: 2026-01-14
-- Description: Adds full-text search vector column and trigger for hybrid search

-- Add full-text search vector column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate search_vector from existing content
UPDATE documents
SET search_vector = to_tsvector('english', content);

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_documents_search_vector
ON documents USING GIN(search_vector);

-- Create trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION documents_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.content);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS documents_search_vector_update ON documents;

-- Create trigger
CREATE TRIGGER documents_search_vector_update
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_trigger();
