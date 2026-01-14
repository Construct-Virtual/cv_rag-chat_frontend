"""Knowledge gap models for tracking documentation gaps"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class KnowledgeGapCreate(BaseModel):
    """Request model for creating a knowledge gap record"""
    query: str
    conversation_id: Optional[str] = None
    top_similarity_score: Optional[float] = None
    documents_searched: int = 0
    documents_below_threshold: int = 0
    confidence_threshold: float = 0.75
    gap_type: str  # 'no_documents' or 'low_confidence'


class KnowledgeGapResponse(BaseModel):
    """Response model for a knowledge gap"""
    id: str
    user_id: str
    query: str
    conversation_id: Optional[str] = None
    top_similarity_score: Optional[float] = None
    documents_searched: int
    documents_below_threshold: int
    confidence_threshold: float
    gap_type: str
    status: str
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str
    updated_at: str


class GapResolutionRequest(BaseModel):
    """Request model for resolving a gap"""
    status: str  # 'addressed' or 'dismissed'
    resolution_notes: Optional[str] = None


class GapAnalysisRequest(BaseModel):
    """Request model for gap analysis mode query"""
    conversation_id: str
    message: str


class GapAnalysisResponse(BaseModel):
    """Response model for gap analysis"""
    has_relevant_docs: bool
    existing_topics: List[dict]  # Topics that ARE covered
    missing_topics: List[str]  # Inferred topics that aren't covered
    suggestions: List[str]  # For admins: what to create/update
    top_similarity_score: Optional[float] = None
    documents_searched: int = 0


class GapStatistics(BaseModel):
    """Statistics for the gap dashboard"""
    total_gaps: int
    open_gaps: int
    addressed_gaps: int
    dismissed_gaps: int
    gaps_by_type: dict  # {'no_documents': N, 'low_confidence': M}


class GapDashboardResponse(BaseModel):
    """Full dashboard response"""
    statistics: GapStatistics
    recent_gaps: List[KnowledgeGapResponse]
    top_queries: List[dict]  # Most common gap queries
