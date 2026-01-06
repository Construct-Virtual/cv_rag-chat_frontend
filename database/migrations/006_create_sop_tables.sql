-- Migration 006: Create SOP-prefixed tables for chat system
-- Purpose: Isolate SOP chat system tables from other systems sharing the database

-- SOP Users table (separate from shared users table)
CREATE TABLE IF NOT EXISTS sop_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'employee',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    last_login TIMESTAMP
);

-- SOP Conversations table (separate from shared conversations table)
CREATE TABLE IF NOT EXISTS sop_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES sop_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    is_shared BOOLEAN DEFAULT false,
    share_token TEXT UNIQUE
);

-- SOP Messages table (separate from shared messages table)
CREATE TABLE IF NOT EXISTS sop_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES sop_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMP DEFAULT now(),
    token_count INTEGER
);

-- SOP Refresh tokens table
CREATE TABLE IF NOT EXISTS sop_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES sop_users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_sop_users_updated_at ON sop_users;
CREATE TRIGGER update_sop_users_updated_at BEFORE UPDATE ON sop_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sop_conversations_updated_at ON sop_conversations;
CREATE TRIGGER update_sop_conversations_updated_at BEFORE UPDATE ON sop_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sop_conversations_user_id ON sop_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_messages_conversation_id ON sop_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sop_messages_created_at ON sop_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_sop_refresh_tokens_user_id ON sop_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_refresh_tokens_token ON sop_refresh_tokens(token);

-- Comments for documentation
COMMENT ON TABLE sop_users IS 'SOP chat system users with role-based access';
COMMENT ON TABLE sop_conversations IS 'SOP chat system conversation history';
COMMENT ON TABLE sop_messages IS 'SOP chat system messages within conversations';
COMMENT ON TABLE sop_refresh_tokens IS 'SOP chat system JWT refresh tokens for authentication';
