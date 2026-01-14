"""RAG (Retrieval-Augmented Generation) service with OpenAI and PostgreSQL pgvector"""
from typing import List, Dict, Any, AsyncGenerator
import json
import psycopg2
from urllib.parse import unquote
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
        self.confidence_threshold = settings.rag_confidence_threshold
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

        # Search using hybrid search: pgvector (semantic) + full-text (keyword)
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Hybrid search: 70% vector similarity + 30% keyword matching
                cursor.execute(
                    """
                    SELECT
                        d.id,
                        d.content,
                        d.metadata,
                        1 - (d.embedding <=> %s::vector) as vector_score,
                        ts_rank(d.search_vector, plainto_tsquery('english', %s)) as keyword_score,
                        (0.7 * (1 - (d.embedding <=> %s::vector))) +
                        (0.3 * COALESCE(ts_rank(d.search_vector, plainto_tsquery('english', %s)), 0)) as similarity_score
                    FROM documents d
                    WHERE d.metadata->>'allowed_roles' LIKE %s
                       OR d.metadata->>'is_public' = 'true'
                    ORDER BY similarity_score DESC
                    LIMIT %s
                    """,
                    (
                        str(query_embedding),
                        query,
                        str(query_embedding),
                        query,
                        f'%"{user_role}"%',
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

    def search_documents_with_confidence(self, query: str, user_role: str, top_k: int = None) -> Dict[str, Any]:
        """
        Search documents with confidence threshold filtering.

        Returns documents that meet the confidence threshold plus metadata about gaps.

        Args:
            query: User's search query
            user_role: Current user's role for permission filtering
            top_k: Number of results to return (defaults to config setting)

        Returns:
            Dict with:
            - passing_docs: Documents meeting confidence threshold
            - filtered_docs: Documents below threshold (for gap analysis)
            - has_gap: True if no documents meet threshold
            - top_score: Highest similarity score found
        """
        # Get all matching documents first
        all_docs = self.search_documents(query, user_role, top_k)

        # Split by confidence threshold
        passing_docs = []
        filtered_docs = []
        top_score = 0.0

        for doc in all_docs:
            score = doc.get("similarity_score", 0.0)
            top_score = max(top_score, score)

            if score >= self.confidence_threshold:
                passing_docs.append(doc)
            else:
                filtered_docs.append(doc)

        result = {
            "passing_docs": passing_docs,
            "filtered_docs": filtered_docs,
            "has_gap": len(passing_docs) == 0,
            "top_score": top_score,
            "documents_searched": len(all_docs),
            "threshold": self.confidence_threshold
        }

        # Log search results for debugging
        print(f"[RAG] Search: {len(all_docs)} docs found, {len(passing_docs)} passed threshold ({self.confidence_threshold}), top_score: {top_score:.3f}, has_gap: {result['has_gap']}")

        return result

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
            print(f"[RAG] No documents provided to generate_response for query: {query[:50]}...")
            return self._no_documents_response(query, user_role)

        # Log document scores for debugging
        scores = [doc.get("similarity_score", 0) for doc in retrieved_docs]
        print(f"[RAG] Generating response with {len(retrieved_docs)} docs, scores: {scores}")

        # Build context from retrieved documents
        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            file_name = doc.get("metadata", {}).get("file_name", f"Document {i}")
            context_parts.append(
                f"[Source {i}: {file_name}]\n{doc['content']}\n"
            )

        context = "\n".join(context_parts)

        # Create messages for the LLM
        system_prompt = """You are a company knowledge assistant. Your responses are rendered as Markdown.

CRITICAL: You MUST use the provided context to answer. The context has already been verified as relevant.

RESPONSE RULES:
1. Start with a DIRECT ANSWER to the question using the provided context
2. Provide supporting context, examples, and explanations to be genuinely helpful
3. Cite sources as [Source N]
4. Do NOT repeat the question or add unnecessary preamble
5. ALWAYS answer based on what IS in the context, even if it's partial or tangentially related
6. Only say you cannot answer if the context is completely empty

FORMAT:
- Use bullet points for lists
- Use headings (## format) to organize longer responses
- Keep paragraphs 2-4 sentences
- Put blank lines before lists and headings
- Be clear and thorough - include relevant details that help understanding"""

        user_prompt = f"""Context:
{context}

Question: {query}

Provide a thorough, well-structured answer. Include relevant details and examples from the documents. Cite sources as [Source N]."""

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
            file_name = doc.get("metadata", {}).get("file_name", f"Document {i}")
            context_parts.append(
                f"[Source {i}: {file_name}]\n{doc['content']}\n"
            )

        context = "\n".join(context_parts)

        # Create messages for the LLM
        system_prompt = """You are a company knowledge assistant. Your responses are rendered as Markdown.

CRITICAL: You MUST use the provided context to answer. The context has already been verified as relevant.

RESPONSE RULES:
1. Start with a DIRECT ANSWER to the question using the provided context
2. Provide supporting context, examples, and explanations to be genuinely helpful
3. Cite sources as [Source N]
4. Do NOT repeat the question or add unnecessary preamble
5. ALWAYS answer based on what IS in the context, even if it's partial or tangentially related
6. Only say you cannot answer if the context is completely empty

FORMAT:
- Use bullet points for lists
- Use headings (## format) to organize longer responses
- Keep paragraphs 2-4 sentences
- Put blank lines before lists and headings
- Be clear and thorough - include relevant details that help understanding"""

        user_prompt = f"""Context:
{context}

Question: {query}

Provide a thorough, well-structured answer. Include relevant details and examples from the documents. Cite sources as [Source N]."""

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

    def _no_documents_response(self, query: str, user_role: str, gap_type: str = "no_documents", top_score: float = 0.0) -> str:
        """
        Generate response when no relevant documents pass confidence threshold.

        Args:
            query: User's query
            user_role: User's role
            gap_type: 'no_documents' or 'low_confidence'
            top_score: Highest similarity score found (for low_confidence)
        """
        if gap_type == "low_confidence":
            return (
                "I don't have sufficiently relevant documentation to answer your question.\n\n"
                "**Knowledge Gap Identified**: This topic may need to be documented or existing documentation may need to be updated."
            )
        else:
            return (
                f"I don't have any documentation about '{query}' available to your role ({user_role}).\n\n"
                f"**Knowledge Gap Identified**: This topic does not appear to be covered in our current documentation.\n\n"
                f"- The information may not be documented yet\n"
                f"- The documentation may be restricted to other roles\n"
                f"- Try rephrasing your question with different keywords"
            )

    def get_source_citations(self, retrieved_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Format source citations from retrieved documents.

        Deduplicates by file_name (keeping highest similarity score) and decodes
        URL-encoded file names for display.

        Args:
            retrieved_docs: Retrieved document chunks

        Returns:
            List of citation objects with metadata
        """
        # Deduplicate by file_name, keeping the doc with highest similarity score
        seen_files: Dict[str, Dict[str, Any]] = {}
        for i, doc in enumerate(retrieved_docs):
            metadata = doc.get("metadata", {})
            file_name = metadata.get("file_name", f"Document {i + 1}")
            score = doc.get("similarity_score", 0.0)

            if file_name not in seen_files or score > seen_files[file_name].get("similarity_score", 0.0):
                seen_files[file_name] = doc

        # Build citations from deduplicated docs
        citations = []
        for i, (file_name, doc) in enumerate(seen_files.items(), 1):
            metadata = doc.get("metadata", {})
            content = doc.get("content", "")
            # Decode URL-encoded characters for display (e.g., %20 -> space)
            display_name = unquote(file_name)
            citations.append({
                "id": doc.get("id", str(i)),
                "number": i,
                "file_name": file_name,  # Keep original (encoded) for URLs
                "display_name": display_name,  # Decoded for human readability
                "file_url": metadata.get("file_url"),  # Link to source document (keep encoded)
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
