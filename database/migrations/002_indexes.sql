-- SOP AI Agent Chat Interface - Indexes Migration
-- This migration creates indexes for performance optimization

-- Vector search index on documents using IVFFlat
-- Note: Using 1536 dimensions (text-embedding-3-small) to stay within pgvector limits
CREATE INDEX IF NOT EXISTS idx_documents_embedding
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Indexes for message lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
ON messages(created_at DESC);

-- Indexes for conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user
ON conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_share_token
ON conversations(share_token)
WHERE share_token IS NOT NULL;

-- Indexes for SOP permissions
CREATE INDEX IF NOT EXISTS idx_sop_permissions_file_name
ON sop_permissions(file_name);

CREATE INDEX IF NOT EXISTS idx_sop_permissions_is_public
ON sop_permissions(is_public);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- Indexes for refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
ON refresh_tokens(token);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
ON refresh_tokens(expires_at);

-- JSONB indexes for metadata searches
CREATE INDEX IF NOT EXISTS idx_documents_metadata_file_name
ON documents ((metadata->>'file_name'));

CREATE INDEX IF NOT EXISTS idx_messages_sources
ON messages USING gin(sources);

-- Comments
COMMENT ON INDEX idx_documents_embedding IS 'IVFFlat index for vector similarity search (1536 dimensions)';
COMMENT ON INDEX idx_conversations_share_token IS 'Partial index for shared conversations only';
