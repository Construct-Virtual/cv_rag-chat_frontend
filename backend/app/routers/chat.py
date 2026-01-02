"""Chat and conversation router"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.chat import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageResponse
)
from app.utils.dependencies import get_current_user
from app.utils.mock_database import mock_db

router = APIRouter()


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new conversation

    - Requires valid access token
    - Creates conversation with optional custom title
    - Returns conversation details
    """
    try:
        conversation = mock_db.create_conversation(
            user_id=current_user["id"],
            title=conversation_data.title
        )

        message_count = mock_db.get_message_count(conversation["id"])

        return ConversationResponse(
            id=conversation["id"],
            user_id=conversation["user_id"],
            title=conversation["title"],
            created_at=conversation["created_at"],
            updated_at=conversation["updated_at"],
            message_count=message_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """
    Get all conversations for current user

    - Requires valid access token
    - Returns list of conversations sorted by updated_at (newest first)
    """
    try:
        conversations = mock_db.find_conversations_by_user(current_user["id"])

        return [
            ConversationResponse(
                id=conv["id"],
                user_id=conv["user_id"],
                title=conv["title"],
                created_at=conv["created_at"],
                updated_at=conv["updated_at"],
                message_count=mock_db.get_message_count(conv["id"])
            )
            for conv in conversations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversations: {str(e)}")


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific conversation

    - Requires valid access token
    - Verifies user owns the conversation
    - Returns conversation details
    """
    try:
        conversation = mock_db.find_conversation_by_id(conversation_id)

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Verify ownership
        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        message_count = mock_db.get_message_count(conversation["id"])

        return ConversationResponse(
            id=conversation["id"],
            user_id=conversation["user_id"],
            title=conversation["title"],
            created_at=conversation["created_at"],
            updated_at=conversation["updated_at"],
            message_count=message_count
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation: {str(e)}")


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    update_data: ConversationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a conversation (e.g., rename)

    - Requires valid access token
    - Verifies user owns the conversation
    - Updates conversation fields
    """
    try:
        conversation = mock_db.find_conversation_by_id(conversation_id)

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Verify ownership
        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Update conversation
        update_dict = update_data.dict(exclude_unset=True)
        updated_conversation = mock_db.update_conversation(conversation_id, **update_dict)

        if not updated_conversation:
            raise HTTPException(status_code=500, detail="Failed to update conversation")

        message_count = mock_db.get_message_count(updated_conversation["id"])

        return ConversationResponse(
            id=updated_conversation["id"],
            user_id=updated_conversation["user_id"],
            title=updated_conversation["title"],
            created_at=updated_conversation["created_at"],
            updated_at=updated_conversation["updated_at"],
            message_count=message_count
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update conversation: {str(e)}")


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a conversation and all its messages

    - Requires valid access token
    - Verifies user owns the conversation
    - Deletes conversation and associated messages
    """
    try:
        conversation = mock_db.find_conversation_by_id(conversation_id)

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Verify ownership
        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Delete conversation
        deleted = mock_db.delete_conversation(conversation_id)

        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete conversation")

        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all messages in a conversation

    - Requires valid access token
    - Verifies user owns the conversation
    - Returns messages sorted by created_at (oldest first)
    """
    try:
        conversation = mock_db.find_conversation_by_id(conversation_id)

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Verify ownership
        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        messages = mock_db.find_messages_by_conversation(conversation_id)

        return [
            MessageResponse(
                id=msg["id"],
                conversation_id=msg["conversation_id"],
                role=msg["role"],
                content=msg["content"],
                created_at=msg["created_at"]
            )
            for msg in messages
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")
