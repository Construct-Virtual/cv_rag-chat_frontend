-- Migration 005: Add created_at column to documents table
-- Purpose: Add timestamp tracking for document embeddings

-- Add created_at column if it doesn't exist
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();

-- Add NOT NULL constraint to content column for data integrity
ALTER TABLE documents
ALTER COLUMN content SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.created_at IS 'Timestamp when document was embedded and inserted';
