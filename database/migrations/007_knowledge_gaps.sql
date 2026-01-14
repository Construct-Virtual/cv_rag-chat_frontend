-- Migration 007: Create knowledge gaps tracking table
-- Tracks user queries that failed to find adequate documentation

CREATE TABLE IF NOT EXISTS sop_knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES sop_users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES sop_conversations(id) ON DELETE SET NULL,
    query TEXT NOT NULL,

    -- Search results metadata
    top_similarity_score FLOAT,
    documents_searched INT DEFAULT 0,
    documents_below_threshold INT DEFAULT 0,
    confidence_threshold FLOAT DEFAULT 0.75,

    -- Gap classification
    gap_type TEXT NOT NULL CHECK (gap_type IN ('no_documents', 'low_confidence')),

    -- Admin action tracking
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'addressed', 'dismissed')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES sop_users(id),
    resolved_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sop_knowledge_gaps_user_id ON sop_knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_knowledge_gaps_status ON sop_knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_sop_knowledge_gaps_created_at ON sop_knowledge_gaps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sop_knowledge_gaps_gap_type ON sop_knowledge_gaps(gap_type);

COMMENT ON TABLE sop_knowledge_gaps IS 'Tracks user queries that failed to find adequate documentation';
COMMENT ON COLUMN sop_knowledge_gaps.gap_type IS 'no_documents = no matching docs found; low_confidence = docs found but below threshold';
COMMENT ON COLUMN sop_knowledge_gaps.status IS 'open = needs attention; addressed = documentation created/updated; dismissed = not actionable';
