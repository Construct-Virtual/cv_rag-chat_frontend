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
            message_count=message_count,
            is_shared=conversation.get("is_shared", False),
            share_token=conversation.get("share_token")
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
            message_count=message_count,
            is_shared=conversation.get("is_shared", False),
            share_token=conversation.get("share_token")
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
            message_count=message_count,
            is_shared=conversation.get("is_shared", False),
            share_token=conversation.get("share_token")
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
                created_at=msg["created_at"],
                sources=msg.get("sources", [])
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
                    content=full_response,
                    sources=citations
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


@router.post("/conversations/{conversation_id}/share", response_model=ConversationResponse)
async def share_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Enable sharing for a conversation

    - Requires valid access token
    - User must own the conversation
    - Generates unique share_token
    - Sets is_shared to true
    - Returns updated conversation with share_token
    """
    try:
        # Get conversation
        conversation = mock_db.find_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Check ownership
        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Enable sharing
        updated_conversation = mock_db.enable_conversation_sharing(conversation_id)
        if not updated_conversation:
            raise HTTPException(status_code=500, detail="Failed to enable sharing")

        message_count = mock_db.get_message_count(conversation_id)

        return ConversationResponse(
            id=updated_conversation["id"],
            user_id=updated_conversation["user_id"],
            title=updated_conversation["title"],
            created_at=updated_conversation["created_at"],
            updated_at=updated_conversation["updated_at"],
            message_count=message_count,
            is_shared=updated_conversation.get("is_shared", False),
            share_token=updated_conversation.get("share_token")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to share conversation: {str(e)}")


@router.delete("/conversations/{conversation_id}/share")
async def unshare_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Disable sharing for a conversation

    - Requires valid access token
    - User must own the conversation
    - Removes share_token
    - Sets is_shared to false
    """
    try:
        # Get conversation
        conversation = mock_db.find_conversation_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Check ownership
        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Disable sharing
        updated_conversation = mock_db.disable_conversation_sharing(conversation_id)
        if not updated_conversation:
            raise HTTPException(status_code=500, detail="Failed to disable sharing")

        return {"message": "Sharing disabled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disable sharing: {str(e)}")


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a specific message

    - Requires valid access token
    - User must own the conversation containing the message
    - Deletes the message from the database
    """
    try:
        # Get message
        message = mock_db.find_message_by_id(message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Get conversation to check ownership
        conversation = mock_db.find_conversation_by_id(message["conversation_id"])
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Check ownership
        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Delete message
        success = mock_db.delete_message(message_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete message")

        return {"message": "Message deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")


@router.post("/messages/{message_id}/regenerate")
async def regenerate_message(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Regenerate an assistant message (deletes old message and creates new response)

    - Requires valid access token
    - User must own the conversation
    - Finds the previous user message
    - Deletes the assistant message
    - Generates new response without creating duplicate user message
    - Returns streaming response via SSE
    """
    try:
        # Get the message to regenerate
        print(f"DEBUG: Looking for message_id: {message_id}")
        print(f"DEBUG: Total messages in DB: {len(mock_db.messages)}")
        message = mock_db.find_message_by_id(message_id)
        print(f"DEBUG: Found message: {message is not None}")
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        if message["role"] != "assistant":
            raise HTTPException(status_code=400, detail="Can only regenerate assistant messages")

        # Get conversation to check ownership
        conversation = mock_db.find_conversation_by_id(message["conversation_id"])
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if conversation["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Find the previous user message
        messages = mock_db.find_messages_by_conversation(conversation["id"])
        message_index = next((i for i, m in enumerate(messages) if m["id"] == message_id), -1)

        if message_index == -1:
            raise HTTPException(status_code=404, detail="Message not found in conversation")

        user_message = None
        for i in range(message_index - 1, -1, -1):
            if messages[i]["role"] == "user":
                user_message = messages[i]
                break

        if not user_message:
            raise HTTPException(status_code=400, detail="No user message found before assistant message")

        # Delete the old assistant message
        mock_db.delete_message(message_id)

        # Update conversation timestamp
        mock_db.update_conversation(conversation["id"])

        # Generate new response using the same logic as /query endpoint
        async def generate_response():
            try:
                # Step 1: Retrieve relevant documents using RAG
                user_role = current_user["role"]
                retrieved_docs = mock_rag_service.search_documents(
                    query=user_message["content"],
                    user_role=user_role,
                    top_k=3
                )

                # Step 2: Generate response using retrieved documents
                ai_response = mock_rag_service.generate_response(
                    query=user_message["content"],
                    retrieved_docs=retrieved_docs,
                    user_role=user_role
                )

                # Step 3: Get source citations
                citations = mock_rag_service.get_source_citations(retrieved_docs)

                # Step 4: Stream the response word by word
                words = ai_response.split()
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

                # Step 5: Save the complete message to database
                assistant_message = mock_db.create_message(
                    conversation_id=conversation["id"],
                    role="assistant",
                    content=full_response,
                    sources=citations
                )

                # Update conversation timestamp again
                mock_db.update_conversation(conversation["id"])

                # Step 6: Send completion event with sources
                completion_data = {
                    "type": "complete",
                    "message_id": assistant_message["id"],
                    "full_content": full_response,
                    "sources": citations
                }
                yield f"data: {json.dumps(completion_data)}\n\n"

            except Exception as e:
                import traceback
                error_message = f"Error generating response: {str(e)}"
                traceback.print_exc()  # Print full traceback to logs
                print(f"ERROR in regenerate: {error_message}")
                yield f"data: {json.dumps({'type': 'error', 'message': error_message})}\n\n"

        return StreamingResponse(
            generate_response(),
            media_type="text/event-stream"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate message: {str(e)}")


@router.get("/shared/{share_token}", response_model=ConversationResponse)
async def get_shared_conversation(share_token: str):
    """
    Get a shared conversation by share token (public endpoint)

    - No authentication required
    - Returns conversation if share_token is valid and is_shared is true
    - Used for viewing shared conversations
    """
    try:
        conversation = mock_db.find_conversation_by_share_token(share_token)
        if not conversation:
            raise HTTPException(status_code=404, detail="Shared conversation not found or sharing has been disabled")

        message_count = mock_db.get_message_count(conversation["id"])

        return ConversationResponse(
            id=conversation["id"],
            user_id=conversation["user_id"],
            title=conversation["title"],
            created_at=conversation["created_at"],
            updated_at=conversation["updated_at"],
            message_count=message_count,
            is_shared=conversation.get("is_shared", False),
            share_token=conversation.get("share_token")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get shared conversation: {str(e)}")


@router.get("/shared/{share_token}/messages", response_model=List[MessageResponse])
async def get_shared_conversation_messages(share_token: str):
    """
    Get messages from a shared conversation (public endpoint)

    - No authentication required
    - Returns messages if share_token is valid and is_shared is true
    """
    try:
        conversation = mock_db.find_conversation_by_share_token(share_token)
        if not conversation:
            raise HTTPException(status_code=404, detail="Shared conversation not found or sharing has been disabled")

        messages = mock_db.find_messages_by_conversation(conversation["id"])

        return [
            MessageResponse(
                id=msg["id"],
                conversation_id=msg["conversation_id"],
                role=msg["role"],
                content=msg["content"],
                created_at=msg["created_at"],
                sources=msg.get("sources", [])
            )
            for msg in messages
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get shared conversation messages: {str(e)}")
