"""Knowledge gap analysis router"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from app.models.gaps import (
    GapAnalysisRequest,
    GapAnalysisResponse,
    GapResolutionRequest,
    GapStatistics,
    GapDashboardResponse,
    KnowledgeGapResponse
)
from app.utils.dependencies import get_current_user
from app.services import db, rag_service

router = APIRouter()


@router.post("/analyze", response_model=GapAnalysisResponse)
async def analyze_knowledge_gaps(
    request: GapAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a query for knowledge gaps (gap analysis mode)

    - Requires valid access token
    - Verifies user owns the conversation
    - Uses RAG service to search documents
    - Returns existing topics, missing topics, and suggestions
    """
    try:
        # Verify conversation exists and user owns it
        conversation = db.find_conversation_by_id(request.conversation_id)

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Search documents with confidence filtering
        user_role = current_user["role"]
        search_result = rag_service.search_documents_with_confidence(
            query=request.message,
            user_role=user_role,
            top_k=10  # Get more documents for analysis
        )

        # Determine if we have relevant docs
        has_relevant_docs = not search_result["has_gap"]

        # Build existing topics from passing documents
        existing_topics = []
        for doc in search_result["passing_docs"]:
            metadata = doc.get("metadata", {})
            existing_topics.append({
                "topic": metadata.get("file_name", "Unknown"),
                "category": metadata.get("category", "General"),
                "similarity_score": doc.get("similarity_score", 0.0)
            })

        # Infer missing topics based on the query and low-confidence results
        missing_topics = []
        suggestions = []

        if search_result["has_gap"]:
            # Extract potential topics from the query
            missing_topics.append(request.message)

            # Generate suggestions for admins
            if current_user["role"] == "admin":
                if search_result["documents_searched"] == 0:
                    suggestions.append(f"Create new documentation covering: {request.message}")
                else:
                    suggestions.append(f"Update existing documentation to better cover: {request.message}")
                    suggestions.append("Consider adding more detailed content on this topic")

                # Check for low-confidence matches that might need improvement
                for doc in search_result["filtered_docs"][:3]:
                    metadata = doc.get("metadata", {})
                    file_name = metadata.get("file_name", "Unknown document")
                    score = doc.get("similarity_score", 0.0)
                    suggestions.append(
                        f"Review and enhance '{file_name}' (current relevance: {score*100:.0f}%)"
                    )

        return GapAnalysisResponse(
            has_relevant_docs=has_relevant_docs,
            existing_topics=existing_topics,
            missing_topics=missing_topics,
            suggestions=suggestions,
            top_similarity_score=search_result["top_score"],
            documents_searched=search_result["documents_searched"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze knowledge gaps: {str(e)}")


@router.get("/dashboard", response_model=GapDashboardResponse)
async def get_gap_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """
    Get gap dashboard statistics

    - Requires valid access token
    - Returns statistics and recent gaps
    - Available to all authenticated users
    """
    try:
        # Get statistics
        stats_data = db.get_gap_statistics()
        statistics = GapStatistics(
            total_gaps=stats_data["total_gaps"],
            open_gaps=stats_data["open_gaps"],
            addressed_gaps=stats_data["addressed_gaps"],
            dismissed_gaps=stats_data["dismissed_gaps"],
            gaps_by_type=stats_data["gaps_by_type"]
        )

        # Get recent gaps (last 10)
        recent_gaps_data = db.find_knowledge_gaps(limit=10, offset=0)
        recent_gaps = [
            KnowledgeGapResponse(
                id=gap["id"],
                user_id=gap["user_id"],
                query=gap["query"],
                conversation_id=gap.get("conversation_id"),
                top_similarity_score=gap.get("top_similarity_score"),
                documents_searched=gap["documents_searched"],
                documents_below_threshold=gap["documents_below_threshold"],
                confidence_threshold=gap["confidence_threshold"],
                gap_type=gap["gap_type"],
                status=gap["status"],
                resolution_notes=gap.get("resolution_notes"),
                resolved_by=gap.get("resolved_by"),
                resolved_at=gap.get("resolved_at"),
                created_at=gap["created_at"],
                updated_at=gap["updated_at"]
            )
            for gap in recent_gaps_data
        ]

        # Get top queries
        top_queries = db.get_top_gap_queries(limit=10)

        return GapDashboardResponse(
            statistics=statistics,
            recent_gaps=recent_gaps,
            top_queries=top_queries
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get gap dashboard: {str(e)}")


@router.get("/list", response_model=List[KnowledgeGapResponse])
async def list_knowledge_gaps(
    status: Optional[str] = Query(None, description="Filter by status: open, addressed, dismissed"),
    gap_type: Optional[str] = Query(None, description="Filter by gap type: no_documents, low_confidence"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: dict = Depends(get_current_user)
):
    """
    List knowledge gaps with filtering

    - Requires valid access token
    - Supports filtering by status and gap_type
    - Supports pagination with limit and offset
    """
    try:
        gaps_data = db.find_knowledge_gaps(
            status=status,
            gap_type=gap_type,
            limit=limit,
            offset=offset
        )

        return [
            KnowledgeGapResponse(
                id=gap["id"],
                user_id=gap["user_id"],
                query=gap["query"],
                conversation_id=gap.get("conversation_id"),
                top_similarity_score=gap.get("top_similarity_score"),
                documents_searched=gap["documents_searched"],
                documents_below_threshold=gap["documents_below_threshold"],
                confidence_threshold=gap["confidence_threshold"],
                gap_type=gap["gap_type"],
                status=gap["status"],
                resolution_notes=gap.get("resolution_notes"),
                resolved_by=gap.get("resolved_by"),
                resolved_at=gap.get("resolved_at"),
                created_at=gap["created_at"],
                updated_at=gap["updated_at"]
            )
            for gap in gaps_data
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list knowledge gaps: {str(e)}")


@router.put("/{gap_id}/resolve", response_model=KnowledgeGapResponse)
async def resolve_knowledge_gap(
    gap_id: str,
    request: GapResolutionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a knowledge gap as resolved

    - Requires valid access token
    - Admin only - checks user role
    - Updates gap status and adds resolution notes
    """
    try:
        # Check if user is admin
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="Only administrators can resolve knowledge gaps"
            )

        # Validate status
        if request.status not in ["addressed", "dismissed"]:
            raise HTTPException(
                status_code=400,
                detail="Status must be 'addressed' or 'dismissed'"
            )

        # Check if gap exists
        existing_gap = db.find_knowledge_gap_by_id(gap_id)
        if not existing_gap:
            raise HTTPException(status_code=404, detail="Knowledge gap not found")

        # Update the gap
        updated_gap = db.update_gap_status(
            gap_id=gap_id,
            status=request.status,
            resolved_by=current_user["id"],
            resolution_notes=request.resolution_notes
        )

        if not updated_gap:
            raise HTTPException(status_code=500, detail="Failed to update knowledge gap")

        return KnowledgeGapResponse(
            id=updated_gap["id"],
            user_id=updated_gap["user_id"],
            query=updated_gap["query"],
            conversation_id=updated_gap.get("conversation_id"),
            top_similarity_score=updated_gap.get("top_similarity_score"),
            documents_searched=updated_gap["documents_searched"],
            documents_below_threshold=updated_gap["documents_below_threshold"],
            confidence_threshold=updated_gap["confidence_threshold"],
            gap_type=updated_gap["gap_type"],
            status=updated_gap["status"],
            resolution_notes=updated_gap.get("resolution_notes"),
            resolved_by=updated_gap.get("resolved_by"),
            resolved_at=updated_gap.get("resolved_at"),
            created_at=updated_gap["created_at"],
            updated_at=updated_gap["updated_at"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve knowledge gap: {str(e)}")
