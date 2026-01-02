#!/usr/bin/env python3
"""Script to update chat router with RAG integration"""

# Read the file
with open('backend/app/routers/chat.py', 'r') as f:
    content = f.read()

# Find and replace the mock response section
old_code = """                # Mock AI response for now (before implementing RAG)
                mock_response = f"I understand you're asking about: '{query_data.message}'. This is a mock response. In production, this would use RAG to search SOPs and provide relevant information based on your role ({current_user['role']}).\""""

new_code = """                # Step 1: Retrieve relevant documents using RAG
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
                mock_response = ai_response"""

content = content.replace(old_code, new_code)

# Also update the completion event to include sources
old_completion = """                # Send completion event
                completion_data = {
                    "type": "complete",
                    "message_id": assistant_message["id"],
                    "full_content": full_response
                }"""

new_completion = """                # Send completion event with citations
                completion_data = {
                    "type": "complete",
                    "message_id": assistant_message["id"],
                    "full_content": full_response,
                    "sources": citations
                }"""

content = content.replace(old_completion, new_completion)

# Update the docstring
old_docstring = '''    """
    Send a message and receive a streaming AI response

    - Requires valid access token
    - Verifies user owns the conversation
    - Saves user message to database
    - Streams AI response using Server-Sent Events (SSE)
    - Saves AI response to database when complete
    """'''

new_docstring = '''    """
    Send a message and receive a streaming AI response with RAG

    - Requires valid access token
    - Verifies user owns the conversation
    - Saves user message to database
    - Performs RAG retrieval with role-based filtering
    - Streams AI response using Server-Sent Events (SSE)
    - Includes source citations in response
    - Saves AI response to database when complete
    """'''

content = content.replace(old_docstring, new_docstring)

# Write back
with open('backend/app/routers/chat.py', 'w') as f:
    f.write(content)

print("File updated successfully")
