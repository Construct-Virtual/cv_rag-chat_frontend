#!/usr/bin/env python3
"""Test employee access to HR-confidential documents"""
import sys
sys.path.insert(0, 'backend')

from app.utils.mock_rag import MockRAGService

# Create RAG service
rag = MockRAGService()

# Test 1: Employee queries about salary (HR-confidential)
print("=" * 60)
print("TEST 1: Employee queries about salary compensation")
print("=" * 60)
query = "What are the salary ranges for new employees?"
user_role = "employee"

docs = rag.search_documents(query, user_role, top_k=3)
print(f"\nQuery: {query}")
print(f"User Role: {user_role}")
print(f"Documents Retrieved: {len(docs)}")

if len(docs) == 0:
    print("\nCORRECT: No HR-confidential documents returned to employee")
else:
    print(f"\nINCORRECT: Found {len(docs)} documents:")
    for doc in docs:
        print(f"  - {doc['metadata']['display_name']}")
        print(f"    Allowed roles: {doc['allowed_roles']}")
        print(f"    Category: {doc['metadata']['category']}")
        print(f"    Score: {doc.get('similarity_score', 0):.2f}")

# Generate response
response = rag.generate_response(query, docs, user_role)
print(f"\nResponse Preview:")
print(response[:300])
