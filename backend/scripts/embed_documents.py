#!/usr/bin/env python3
"""Embed documents script - generates embeddings for SOP documents"""
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.services.rag_service import rag_service
from app.utils.mock_sop_data import MOCK_DOCUMENTS


def embed_mock_documents():
    """Embed all mock SOP documents into the database"""
    print(f"Using embedding model: {settings.embedding_model}")
    print(f"Embedding dimensions: {settings.embedding_dimensions}")
    print(f"\nFound {len(MOCK_DOCUMENTS)} documents to embed\n")

    success_count = 0
    error_count = 0

    for i, doc in enumerate(MOCK_DOCUMENTS, 1):
        metadata = doc["metadata"].copy()
        metadata["allowed_roles"] = doc["allowed_roles"]

        try:
            print(f"[{i}/{len(MOCK_DOCUMENTS)}] Embedding: {metadata.get('display_name', 'Unknown')}")

            doc_id = rag_service.embed_document(
                content=doc["content"],
                metadata=metadata
            )

            print(f"  [OK] Embedded as document ID: {doc_id}")
            success_count += 1

        except Exception as e:
            print(f"  [FAIL] Failed: {e}")
            error_count += 1

    print(f"\nCompleted: {success_count} embedded, {error_count} errors")
    return error_count == 0


def verify_embeddings():
    """Verify embeddings were created correctly"""
    import psycopg2
    from psycopg2.extras import RealDictCursor

    conn = psycopg2.connect(settings.database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("SELECT COUNT(*) as count FROM documents")
    count = cursor.fetchone()["count"]
    print(f"\nTotal documents in database: {count}")

    cursor.execute("""
        SELECT
            metadata->>'display_name' as display_name,
            metadata->>'category' as category,
            LENGTH(content) as content_length,
            CASE WHEN embedding IS NOT NULL THEN 'Yes' ELSE 'No' END as has_embedding
        FROM documents
        ORDER BY id
    """)

    print("\nDocument verification:")
    for row in cursor.fetchall():
        print(f"  - {row['display_name']} ({row['category']}): "
              f"{row['content_length']} chars, embedding: {row['has_embedding']}")

    cursor.close()
    conn.close()


def test_search():
    """Test vector search functionality"""
    print("\n" + "="*50)
    print("Testing vector search...")
    print("="*50)

    test_queries = [
        ("time off", "employee"),
        ("compensation salary", "hr"),
        ("database access", "admin"),
        ("remote work", "employee"),
    ]

    for query, role in test_queries:
        print(f"\nQuery: '{query}' (role: {role})")
        results = rag_service.search_documents(query, role, top_k=2)

        if results:
            for i, doc in enumerate(results, 1):
                display_name = doc.get("metadata", {}).get("display_name", "Unknown")
                score = doc.get("similarity_score", 0)
                print(f"  {i}. {display_name} (score: {score:.4f})")
        else:
            print("  No results found")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Embed SOP documents')
    parser.add_argument('command', nargs='?', default='all',
                       choices=['embed', 'verify', 'test', 'all'],
                       help='Command to run (default: all)')

    args = parser.parse_args()

    print(f"Database URL: {settings.database_url[:50]}...")
    print()

    try:
        if args.command == 'embed':
            embed_mock_documents()
        elif args.command == 'verify':
            verify_embeddings()
        elif args.command == 'test':
            test_search()
        elif args.command == 'all':
            success = embed_mock_documents()
            if success:
                verify_embeddings()
                test_search()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
