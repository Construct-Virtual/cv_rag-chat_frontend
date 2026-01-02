#!/usr/bin/env python3
import sys
sys.path.insert(0, 'backend')

from app.utils.mock_rag import MockRAGService

rag = MockRAGService()

# Try a very specific query about HR-only content
queries = [
    "What is the disciplinary action process?",
    "Tell me about the compensation guidelines",
    "What are the performance improvement plans?",
]

for query in queries:
    print(f"\n{'='*60}")
    print(f"Query: {query}")
    print(f"Role: employee")
    docs = rag.search_documents(query, "employee", top_k=3)
    print(f"Documents found: {len(docs)}")
    if docs:
        for doc in docs:
            print(f"  - {doc['metadata']['display_name']} ({doc['metadata']['category']})")
    else:
        print("  (none - would show access denied message)")
