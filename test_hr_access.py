#!/usr/bin/env python3
import sys
sys.path.insert(0, 'backend')

from app.utils.mock_rag import MockRAGService

rag = MockRAGService()

query = "What is the compensation and salary guidelines?"

print("="*60)
print("Employee Role Test")
print("="*60)
docs_employee = rag.search_documents(query, "employee", top_k=5)
print(f"Documents accessible to employee: {len(docs_employee)}")
for doc in docs_employee:
    print(f"  - {doc['metadata']['display_name']}")
    if "Compensation" in doc['metadata']['display_name']:
        print("    ERROR: Employee should NOT see compensation docs!")

print("\n" + "="*60)
print("HR Manager Role Test")
print("="*60)
docs_hr = rag.search_documents(query, "hr", top_k=5)
print(f"Documents accessible to HR: {len(docs_hr)}")
has_compensation = False
for doc in docs_hr:
    print(f"  - {doc['metadata']['display_name']}")
    if "Compensation" in doc['metadata']['display_name']:
        has_compensation = True
        print("    CORRECT: HR can access compensation docs!")

if not has_compensation:
    print("\nERROR: HR should have access to Compensation documents!")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"Role-based filtering working: {len(docs_hr) > len(docs_employee) or has_compensation}")
