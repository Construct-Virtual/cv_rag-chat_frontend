#!/usr/bin/env python3
"""Test script to verify RAG backend is working"""

import sys
sys.path.insert(0, 'backend')

from app.utils.mock_rag import mock_rag_service

# Test RAG service
print("Testing RAG service...")

# Test document search
retrieved_docs = mock_rag_service.search_documents(
    query="employee onboarding process",
    user_role="admin",
    top_k=3
)

print(f"\nFound {len(retrieved_docs)} documents")
for i, doc in enumerate(retrieved_docs, 1):
    print(f"\n{i}. {doc['metadata']['display_name']}")
    print(f"   Similarity: {doc.get('similarity_score', 0):.2f}")
    print(f"   Preview: {doc['content'][:100]}...")

# Test response generation
response = mock_rag_service.generate_response(
    query="What is the employee onboarding process?",
    retrieved_docs=retrieved_docs,
    user_role="admin"
)

print(f"\nGenerated response:\n{response}")

# Test citations
citations = mock_rag_service.get_source_citations(retrieved_docs)
print(f"\nCitations: {len(citations)}")
for citation in citations:
    print(f"  - {citation['display_name']} (score: {citation['similarity_score']:.2f})")

print("\n✓ RAG backend test successful!")
