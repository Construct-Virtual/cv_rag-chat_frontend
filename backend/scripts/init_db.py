#!/usr/bin/env python3
"""Database initialization script - runs migrations and seeds"""
import os
import sys
import glob
import psycopg2
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings


def get_connection():
    """Get database connection"""
    return psycopg2.connect(settings.database_url)


def run_migrations():
    """Run all migration files in order"""
    migrations_dir = Path(__file__).parent.parent.parent / "database" / "migrations"
    migration_files = sorted(glob.glob(str(migrations_dir / "*.sql")))

    if not migration_files:
        print("No migration files found")
        return

    conn = get_connection()
    cursor = conn.cursor()

    for migration_file in migration_files:
        filename = os.path.basename(migration_file)
        print(f"Running migration: {filename}")

        with open(migration_file, 'r') as f:
            sql = f.read()

        try:
            cursor.execute(sql)
            conn.commit()
            print(f"  [OK] {filename} completed")
        except psycopg2.errors.DuplicateObject as e:
            conn.rollback()
            print(f"  [SKIP] {filename} already applied: {str(e).split(chr(10))[0]}")
        except psycopg2.errors.DuplicateTable as e:
            conn.rollback()
            print(f"  [SKIP] {filename} tables already exist: {str(e).split(chr(10))[0]}")
        except Exception as e:
            conn.rollback()
            print(f"  [FAIL] {filename} failed: {e}")
            raise

    cursor.close()
    conn.close()
    print("\nMigrations completed!")


def run_seeds():
    """Run all seed files in order"""
    seeds_dir = Path(__file__).parent.parent.parent / "database" / "seeds"
    seed_files = sorted(glob.glob(str(seeds_dir / "*.sql")))

    if not seed_files:
        print("No seed files found")
        return

    conn = get_connection()
    cursor = conn.cursor()

    for seed_file in seed_files:
        filename = os.path.basename(seed_file)
        print(f"Running seed: {filename}")

        with open(seed_file, 'r') as f:
            sql = f.read()

        try:
            cursor.execute(sql)
            conn.commit()
            print(f"  [OK] {filename} completed")
        except Exception as e:
            conn.rollback()
            print(f"  [FAIL] {filename} failed: {e}")
            raise

    cursor.close()
    conn.close()
    print("\nSeeds completed!")


def verify_database():
    """Verify database connection and tables"""
    conn = get_connection()
    cursor = conn.cursor()

    # Check tables exist
    cursor.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tables = [row[0] for row in cursor.fetchall()]

    print("\nDatabase tables:")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  - {table}: {count} rows")

    # Check if pgvector extension is installed
    cursor.execute("SELECT extname FROM pg_extension WHERE extname = 'vector'")
    if cursor.fetchone():
        print("\n[OK] pgvector extension installed")
    else:
        print("\n[FAIL] pgvector extension NOT installed")

    cursor.close()
    conn.close()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Initialize database')
    parser.add_argument('command', nargs='?', default='all',
                       choices=['migrate', 'seed', 'verify', 'all'],
                       help='Command to run (default: all)')

    args = parser.parse_args()

    print(f"Database URL: {settings.database_url[:50]}...")
    print()

    try:
        if args.command == 'migrate':
            run_migrations()
        elif args.command == 'seed':
            run_seeds()
        elif args.command == 'verify':
            verify_database()
        elif args.command == 'all':
            run_migrations()
            print()
            run_seeds()
            print()
            verify_database()
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
