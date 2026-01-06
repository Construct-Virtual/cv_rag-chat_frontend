"""Disable Row Level Security on all application tables"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
import psycopg2

def disable_rls():
    """Disable RLS on all SOP system tables for service role access"""
    conn = psycopg2.connect(settings.database_url)
    cur = conn.cursor()

    # SOP system tables only (prefixed with sop_)
    tables = [
        'sop_users',
        'sop_conversations',
        'sop_messages',
        'sop_permissions',
        'sop_refresh_tokens',
        'documents'  # Shared documents table for vector search
    ]

    print('Disabling Row Level Security on SOP system tables...')
    for table in tables:
        try:
            cur.execute(f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY')
            print(f'  [OK] Disabled RLS on {table}')
        except Exception as e:
            print(f'  [SKIP] {table}: {str(e)[:60]}')

    conn.commit()
    cur.close()
    conn.close()
    print('\nRLS disabled successfully on SOP tables!')

if __name__ == '__main__':
    disable_rls()
