"""Mock RAG (Retrieval-Augmented Generation) service for development"""
from typing import List, Dict, Any
import re
from app.utils.mock_sop_data import MOCK_DOCUMENTS


class MockRAGService:
    """
    Mock RAG service that simulates vector search and retrieval
    In production, this would use OpenAI embeddings and Supabase vector search
    """

    def __init__(self):
        self.documents = MOCK_DOCUMENTS

    def search_documents(self, query: str, user_role: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Simulate vector similarity search with role-based filtering

        Args:
            query: User's search query
            user_role: Current user's role (for permission filtering)
            top_k: Number of top results to return

        Returns:
            List of relevant document chunks with metadata and similarity scores
        """
        # Filter documents by user role permission
        accessible_docs = [
            doc for doc in self.documents
            if user_role in doc["allowed_roles"]
        ]

        # Simple keyword-based matching (simulating vector similarity)
        query_lower = query.lower()
        query_keywords = set(re.findall(r'\w+', query_lower))

        # Score each document by keyword overlap
        scored_docs = []
        for doc in accessible_docs:
            content_lower = doc["content"].lower()
            content_keywords = set(re.findall(r'\w+', content_lower))

            # Calculate simple overlap score
            overlap = len(query_keywords & content_keywords)
            if overlap > 0:
                # Boost score if query appears as substring
                if any(keyword in content_lower for keyword in query_keywords):
                    overlap *= 2

                scored_docs.append({
                    **doc,
                    "similarity_score": min(overlap / 10.0, 0.95)  # Normalize to 0-0.95 range
                })

        # Sort by similarity score
        scored_docs.sort(key=lambda x: x["similarity_score"], reverse=True)

        # Return top k results
        return scored_docs[:top_k]

    def generate_response(self, query: str, retrieved_docs: List[Dict[str, Any]], user_role: str) -> str:
        """
        Generate AI response using retrieved documents as context

        Args:
            query: User's query
            retrieved_docs: Retrieved document chunks
            user_role: User's role

        Returns:
            Generated response text
        """
        if not retrieved_docs:
            return self._no_documents_response(query, user_role)

        # Build context from retrieved documents
        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            context_parts.append(
                f"[Source {i}: {doc['metadata']['display_name']}]\n{doc['content']}\n"
            )

        context = "\n".join(context_parts)

        # Simulate LLM response (in production, this would use OpenAI API)
        response = self._mock_llm_response(query, context, retrieved_docs)

        return response

    def _mock_llm_response(self, query: str, context: str, docs: List[Dict[str, Any]]) -> str:
        """
        Mock LLM response generation
        In production, this would call OpenAI API with the context
        """
        # Extract key information from documents
        info_snippets = []
        for doc in docs:
            content = doc["content"]
            # Extract first sentence or key point
            sentences = content.split(". ")
            if sentences:
                info_snippets.append(sentences[0])

        # Generate a response that incorporates the information
        response = f"Based on the company SOPs, I can help answer your question about '{query}'.\n\n"

        # Add information from retrieved documents
        for snippet in info_snippets[:2]:  # Use top 2 snippets
            response += f"{snippet}. "

        # Add a helpful closing
        response += "\n\nIs there anything specific you'd like to know more about?"

        return response

    def _no_documents_response(self, query: str, user_role: str) -> str:
        """Generate response when no relevant documents are found"""
        return (
            f"I don't have access to information about '{query}' in the SOPs "
            f"available to your role ({user_role}). This could mean:\n\n"
            f"• The information isn't covered in our current SOPs\n"
            f"• The information is restricted to different user roles\n"
            f"• Try rephrasing your question with different keywords\n\n"
            f"If you believe you should have access to this information, "
            f"please contact your administrator."
        )

    def get_source_citations(self, retrieved_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Format source citations from retrieved documents

        Args:
            retrieved_docs: Retrieved document chunks

        Returns:
            List of citation objects with metadata
        """
        citations = []
        for i, doc in enumerate(retrieved_docs, 1):
            citations.append({
                "id": doc["id"],
                "number": i,
                "file_name": doc["metadata"]["file_name"],
                "display_name": doc["metadata"]["display_name"],
                "category": doc["metadata"]["category"],
                "page_number": doc["metadata"].get("page_number"),
                "chunk_index": doc["metadata"].get("chunk_index"),
                "similarity_score": doc.get("similarity_score", 0.0),
                "excerpt": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"]
            })
        return citations


# Global mock RAG service instance
mock_rag_service = MockRAGService()
