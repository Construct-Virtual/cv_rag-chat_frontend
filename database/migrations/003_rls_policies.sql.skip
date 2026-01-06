-- SOP AI Agent Chat Interface - Row Level Security Policies
-- This migration sets up RLS policies for secure data access

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Conversations policies
-- Users can view their own conversations or shared ones
CREATE POLICY conversations_select_policy ON conversations
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        (is_shared = true AND share_token IS NOT NULL)
    );

-- Users can insert their own conversations
CREATE POLICY conversations_insert_policy ON conversations
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own conversations
CREATE POLICY conversations_update_policy ON conversations
    FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own conversations
CREATE POLICY conversations_delete_policy ON conversations
    FOR DELETE
    USING (user_id = auth.uid());

-- Messages policies
-- Users can view messages from accessible conversations
CREATE POLICY messages_select_policy ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (
                conversations.user_id = auth.uid() OR
                (conversations.is_shared = true AND conversations.share_token IS NOT NULL)
            )
        )
    );

-- Users can insert messages to their own conversations
CREATE POLICY messages_insert_policy ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Users can delete messages from their own conversations
CREATE POLICY messages_delete_policy ON messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Refresh tokens policies
-- Users can view their own refresh tokens
CREATE POLICY refresh_tokens_select_policy ON refresh_tokens
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own refresh tokens
CREATE POLICY refresh_tokens_insert_policy ON refresh_tokens
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own refresh tokens
CREATE POLICY refresh_tokens_delete_policy ON refresh_tokens
    FOR DELETE
    USING (user_id = auth.uid());

-- Note: For service role access (backend), these policies are bypassed
-- The backend uses SUPABASE_SERVICE_ROLE_KEY which has superuser privileges
