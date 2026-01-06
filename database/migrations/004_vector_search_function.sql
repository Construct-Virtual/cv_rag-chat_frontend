-- Vector search functions for RAG
-- This file contains both simple and role-based vector similarity search functions

-- Simple vector search without permissions (for admin or unrestricted use)
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_count INT DEFAULT 5,
    filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.metadata,
        1 - (d.embedding <=> query_embedding) as similarity
    FROM documents d
    WHERE d.metadata @> filter
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION match_documents IS 'Performs simple vector similarity search with optional JSONB filter';

-- Create a function for vector similarity search with role filtering
CREATE OR REPLACE FUNCTION search_documents_by_role(
    query_embedding vector(1536),
    user_role TEXT,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.metadata,
        1 - (d.embedding <=> query_embedding) as similarity
    FROM documents d
    WHERE
        -- Check if user role is in allowed_roles array or document is public
        (d.metadata->'allowed_roles' ? user_role)
        OR (d.metadata->>'is_public' = 'true')
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION search_documents_by_role IS 'Performs vector similarity search with role-based access control';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_documents TO PUBLIC;
GRANT EXECUTE ON FUNCTION search_documents_by_role TO PUBLIC;
