"""RAG (Retrieval-Augmented Generation) service with OpenAI and PostgreSQL pgvector"""
from typing import List, Dict, Any, AsyncGenerator
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

from openai import OpenAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings


class RAGService:
    """
    RAG service using OpenAI embeddings and PostgreSQL pgvector for vector search
    """

    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.openai_api_key)
        self.embedding_model = settings.embedding_model
        self.embedding_dimensions = settings.embedding_dimensions
        self.llm_model = settings.llm_model
        self.llm_temperature = settings.llm_temperature
        self.llm_max_tokens = settings.llm_max_tokens
        self.top_k = settings.rag_top_k
        self.database_url = settings.database_url

        # Initialize LangChain LLM for response generation
        self.llm = ChatOpenAI(
            model=self.llm_model,
            temperature=self.llm_temperature,
            max_tokens=self.llm_max_tokens,
            api_key=settings.openai_api_key
        )

    @contextmanager
    def get_connection(self):
        """Get a database connection"""
        conn = psycopg2.connect(
            self.database_url,
            connect_timeout=10,  # 10 second connection timeout
            options='-c statement_timeout=30000'  # 30 second query timeout for PgBouncer compatibility
        )
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text using OpenAI API

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        response = self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=text,
            dimensions=self.embedding_dimensions
        )
        return response.data[0].embedding

    def search_documents(self, query: str, user_role: str, top_k: int = None) -> List[Dict[str, Any]]:
        """
        Search documents using vector similarity with role-based filtering

        Args:
            query: User's search query
            user_role: Current user's role for permission filtering
            top_k: Number of results to return (defaults to config setting)

        Returns:
            List of relevant document chunks with metadata and similarity scores
        """
        if top_k is None:
            top_k = self.top_k

        # Generate embedding for the query
        query_embedding = self.get_embedding(query)

        # Search using pgvector
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Use cosine similarity search with role filtering
                cursor.execute(
                    """
                    SELECT
                        d.id,
                        d.content,
                        d.metadata,
                        1 - (d.embedding <=> %s::vector) as similarity_score
                    FROM documents d
                    WHERE d.metadata->>'allowed_roles' LIKE %s
                       OR d.metadata->>'is_public' = 'true'
                    ORDER BY d.embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (
                        str(query_embedding),
                        f'%"{user_role}"%',
                        str(query_embedding),
                        top_k
                    )
                )
                rows = cursor.fetchall()

        # Format results to match the mock interface
        results = []
        for row in rows:
            metadata = row["metadata"] if isinstance(row["metadata"], dict) else json.loads(row["metadata"])
            results.append({
                "id": str(row["id"]),
                "content": row["content"],
                "metadata": metadata,
                "allowed_roles": metadata.get("allowed_roles", []),
                "similarity_score": float(row["similarity_score"])
            })

        return results

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
            display_name = doc.get("metadata", {}).get("display_name", f"Document {i}")
            context_parts.append(
                f"[Source {i}: {display_name}]\n{doc['content']}\n"
            )

        context = "\n".join(context_parts)

        # Create messages for the LLM
        system_prompt = """You are a helpful company knowledge assistant.
Your role is to answer questions based on the company documents provided in the context.
This includes company policies, procedures, product information, pricing, and services.
Always cite your sources using the format [Source N] when referring to specific information.
If the context doesn't contain relevant information, say so clearly.
Be concise, professional, and helpful."""

        user_prompt = f"""Context from company documents:
{context}

User Question: {query}

Please provide a helpful answer based on the documents above. Cite your sources."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Generate response
        response = self.llm.invoke(messages)
        return response.content

    async def generate_response_stream(self, query: str, retrieved_docs: List[Dict[str, Any]],
                                        user_role: str) -> AsyncGenerator[str, None]:
        """
        Generate AI response as an async stream for SSE

        Args:
            query: User's query
            retrieved_docs: Retrieved document chunks
            user_role: User's role

        Yields:
            Response text chunks
        """
        if not retrieved_docs:
            yield self._no_documents_response(query, user_role)
            return

        # Build context from retrieved documents
        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            display_name = doc.get("metadata", {}).get("display_name", f"Document {i}")
            context_parts.append(
                f"[Source {i}: {display_name}]\n{doc['content']}\n"
            )

        context = "\n".join(context_parts)

        # Create messages for the LLM
        system_prompt = """You are a helpful company knowledge assistant.
Your role is to answer questions based on the company documents provided in the context.
This includes company policies, procedures, product information, pricing, and services.
Always cite your sources using the format [Source N] when referring to specific information.
If the context doesn't contain relevant information, say so clearly.
Be concise, professional, and helpful."""

        user_prompt = f"""Context from company documents:
{context}

User Question: {query}

Please provide a helpful answer based on the documents above. Cite your sources."""

        # Use OpenAI streaming directly for better control
        stream = self.openai_client.chat.completions.create(
            model=self.llm_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=self.llm_temperature,
            max_tokens=self.llm_max_tokens,
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

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
            metadata = doc.get("metadata", {})
            content = doc.get("content", "")
            citations.append({
                "id": doc.get("id", str(i)),
                "number": i,
                "file_name": metadata.get("file_name", "unknown"),
                "display_name": metadata.get("display_name", f"Document {i}"),
                "category": metadata.get("category", "General"),
                "page_number": metadata.get("page_number"),
                "chunk_index": metadata.get("chunk_index"),
                "similarity_score": doc.get("similarity_score", 0.0),
                "excerpt": content[:200] + "..." if len(content) > 200 else content
            })
        return citations

    def embed_document(self, content: str, metadata: Dict[str, Any]) -> int:
        """
        Embed a document and store it in the database

        Args:
            content: Document content
            metadata: Document metadata

        Returns:
            Document ID
        """
        # Generate embedding
        embedding = self.get_embedding(content)

        # Store in database
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO documents (content, metadata, embedding)
                    VALUES (%s, %s, %s::vector)
                    RETURNING id
                    """,
                    (content, json.dumps(metadata), str(embedding))
                )
                doc_id = cursor.fetchone()[0]

        return doc_id


# Global RAG service instance
rag_service = RAGService()
