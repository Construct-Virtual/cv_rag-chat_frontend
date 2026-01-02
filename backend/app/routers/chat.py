"""Chat and conversation router"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List
import json
import asyncio
from app.models.chat import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageResponse,
    QueryRequest
)
from app.utils.dependencies import get_current_user
from app.utils.mock_rag import mock_rag_service
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


@router.get("/conversations", response_model=List[ConversationResponse], response_model_exclude_none=False)
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """
    Get all conversations for current user

    - Requires valid access token
    - Returns list of conversations sorted by updated_at (newest first)
    - Includes last message preview and timestamp
    """
    try:
        conversations = mock_db.find_conversations_by_user(current_user["id"])

        result = []
        for conv in conversations:
            last_message = mock_db.get_last_message(conv["id"])

            # Create preview from last message (truncate to 60 chars)
            last_message_preview = None
            last_message_at = None
            if last_message:
                content = last_message["content"]
                last_message_preview = content[:60] + "..." if len(content) > 60 else content
                last_message_at = last_message["created_at"]

            result.append(ConversationResponse(
                id=conv["id"],
                user_id=conv["user_id"],
                title=conv["title"],
                created_at=conv["created_at"],
                updated_at=conv["updated_at"],
                message_count=mock_db.get_message_count(conv["id"]),
                last_message_preview=last_message_preview,
                last_message_at=last_message_at
            ))

        return result
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


@router.post("/query")
async def chat_query(
    query_data: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message and receive a streaming AI response with RAG

    - Requires valid access token
    - Verifies user owns the conversation
    - Saves user message to database
    - Performs RAG retrieval with role-based filtering
    - Streams AI response using Server-Sent Events (SSE)
    - Includes source citations in response
    - Saves AI response to database when complete
    """
    try:
        # Verify conversation exists and user owns it
        conversation = mock_db.find_conversation_by_id(query_data.conversation_id)

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Save user message
        user_message = mock_db.create_message(
            conversation_id=query_data.conversation_id,
            role="user",
            content=query_data.message
        )

        # Update conversation timestamp
        mock_db.update_conversation(query_data.conversation_id)

        # Define the streaming response generator
        async def generate_response():
            try:
                # Step 1: Retrieve relevant documents using RAG
                user_role = current_user["role"]
                retrieved_docs = mock_rag_service.search_documents(
                    query=query_data.message,
                    user_role=user_role,
                    top_k=3
                )

                # Step 2: Generate response using retrieved documents
                ai_response = mock_rag_service.generate_response(
                    query=query_data.message,
                    retrieved_docs=retrieved_docs,
                    user_role=user_role
                )

                # Step 3: Get source citations
                citations = mock_rag_service.get_source_citations(retrieved_docs)

                # Use ai_response instead of mock_response
                mock_response = ai_response

                # Stream the response word by word
                words = mock_response.split()
                full_response = ""

                for i, word in enumerate(words):
                    # Add space before word (except first)
                    if i > 0:
                        full_response += " "
                    full_response += word

                    # Send SSE event with the word
                    event_data = {
                        "type": "token",
                        "content": word,
                        "full_content": full_response
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"

                    # Small delay to simulate streaming
                    await asyncio.sleep(0.05)

                # Save assistant message to database
                assistant_message = mock_db.create_message(
                    conversation_id=query_data.conversation_id,
                    role="assistant",
                    content=full_response
                )

                # Update conversation timestamp again
                mock_db.update_conversation(query_data.conversation_id)

                # Send completion event with citations
                completion_data = {
                    "type": "complete",
                    "message_id": assistant_message["id"],
                    "full_content": full_response,
                    "sources": citations
                }
                yield f"data: {json.dumps(completion_data)}\n\n"

            except Exception as e:
                # Send error event
                error_data = {
                    "type": "error",
                    "message": str(e)
                }
                yield f"data: {json.dumps(error_data)}\n\n"

        return StreamingResponse(
            generate_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")
