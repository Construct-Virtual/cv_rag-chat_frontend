"""Chat and conversation models"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ConversationCreate(BaseModel):
    """Request model for creating a new conversation"""
    title: Optional[str] = None


class ConversationResponse(BaseModel):
    """Response model for conversation"""
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0
    last_message_preview: Optional[str] = None
    last_message_at: Optional[str] = None
    is_shared: bool = False
    share_token: Optional[str] = None


class ConversationUpdate(BaseModel):
    """Request model for updating conversation"""
    title: Optional[str] = None


class MessageCreate(BaseModel):
    """Request model for creating a message"""
    conversation_id: str
    content: str
    role: str = "user"  # "user" or "assistant"


class MessageResponse(BaseModel):
    """Response model for message"""
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: str


class QueryRequest(BaseModel):
    """Request model for chat query"""
    conversation_id: str
    message: str


class QueryResponse(BaseModel):
    """Response model for chat query (non-streaming)"""
    message_id: str
    conversation_id: str
    response: str
    sources: List[dict] = []
