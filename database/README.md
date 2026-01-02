# Database Setup Guide

This directory contains all database migrations and seed data for the SOP AI Agent Chat application.

## Prerequisites

- Supabase project created
- PostgreSQL client (psql) installed (optional but recommended)
- Supabase project URL and credentials

## Quick Setup

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migrations in order:
   - Copy and paste `migrations/001_initial_schema.sql` and execute
   - Copy and paste `migrations/002_indexes.sql` and execute
   - Copy and paste `migrations/003_rls_policies.sql` and execute

4. Seed the database:
   - Copy and paste `seeds/001_sample_users.sql` and execute
   - Copy and paste `seeds/002_sample_sop_permissions.sql` and execute

### Option 2: Using psql Command Line

```bash
# Set your Supabase connection details
export DB_HOST="db.your-project.supabase.co"
export DB_USER="postgres"
export DB_NAME="postgres"

# Run migrations
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/001_initial_schema.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/002_indexes.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/003_rls_policies.sql

# Run seeds
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f seeds/001_sample_users.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f seeds/002_sample_sop_permissions.sql
```

### Option 3: Automated Setup Script

```bash
# Create a setup script (run from database directory)
cat > setup.sh << 'EOF'
#!/bin/bash
set -e

echo "Setting up database..."

# Check for environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "Error: SUPABASE_DB_URL not set"
    exit 1
fi

# Run migrations
echo "Running migrations..."
psql $SUPABASE_DB_URL -f migrations/001_initial_schema.sql
psql $SUPABASE_DB_URL -f migrations/002_indexes.sql
psql $SUPABASE_DB_URL -f migrations/003_rls_policies.sql

# Run seeds
echo "Running seed data..."
psql $SUPABASE_DB_URL -f seeds/001_sample_users.sql
psql $SUPABASE_DB_URL -f seeds/002_sample_sop_permissions.sql

echo "Database setup complete!"
EOF

chmod +x setup.sh

# Set your database URL and run
export SUPABASE_DB_URL="postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres"
./setup.sh
```

## Migration Files

### 001_initial_schema.sql
Creates all core tables:
- `users` - Application users with roles
- `documents` - Document chunks with vector embeddings
- `sop_permissions` - Document-level access control
- `conversations` - User conversation history
- `messages` - Individual chat messages
- `refresh_tokens` - JWT refresh tokens

### 002_indexes.sql
Creates performance indexes:
- Vector search index (IVFFlat) on documents
- Conversation and message lookups
- User authentication lookups
- JSONB indexes for metadata

### 003_rls_policies.sql
Sets up Row Level Security:
- Users can only access their own conversations
- Shared conversations are publicly readable
- Messages follow conversation permissions
- Refresh tokens are user-scoped

## Seed Data

### 001_sample_users.sql
Creates test users:
- **admin** / password123 (role: admin)
- **hr_manager** / password123 (role: hr)
- **finance_manager** / password123 (role: finance)
- **manager** / password123 (role: manager)
- **employee** / password123 (role: employee)

⚠️ **Security Warning**: Change passwords in production!

### 002_sample_sop_permissions.sql
Creates sample SOP permissions:
- **Public SOPs**: Accessible by everyone
  - General Company Guidelines
  - Office Safety Procedures
  - IT Acceptable Use Policy
  - Remote Work Policy

- **Restricted SOPs**: Role-based access
  - HR documents (hr, admin)
  - Finance documents (finance, admin)
  - Management documents (manager, admin)
  - Admin-only documents (admin)

## Verifying Setup

### Check Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- conversations
- documents
- messages
- refresh_tokens
- sop_permissions
- users

### Check Vector Extension

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Check Sample Data

```sql
-- Check users
SELECT username, role FROM users;

-- Check SOP permissions
SELECT display_name, is_public, allowed_roles FROM sop_permissions;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
```

### Test Vector Search (After Adding Documents)

```sql
-- Example vector search with permission filtering
SELECT
    content,
    metadata->>'file_name' as file_name,
    1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM documents
WHERE metadata->>'file_name' IN (
    SELECT file_name FROM sop_permissions
    WHERE is_public = true OR 'employee' = ANY(allowed_roles)
)
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

## Adding Your Own Data

### Adding Document Embeddings

Use the backend API to upload and process documents:

```python
# Example Python script to add document embeddings
from openai import OpenAI
from supabase import create_client

client = OpenAI(api_key="your-key")
supabase = create_client("your-url", "your-key")

# Generate embedding
response = client.embeddings.create(
    input="Your document text here",
    model="text-embedding-3-large"
)
embedding = response.data[0].embedding

# Insert into database
supabase.table('documents').insert({
    'content': 'Your document text here',
    'metadata': {
        'file_name': 'your_document.pdf',
        'chunk_index': 0,
        'page_number': 1
    },
    'embedding': embedding
}).execute()
```

### Adding SOP Permissions

```sql
INSERT INTO sop_permissions (file_name, display_name, description, is_public, category, allowed_roles)
VALUES (
    'your_document.pdf',
    'Your Document Title',
    'Description of the document',
    false,  -- Set to true for public access
    'Category',
    ARRAY['role1', 'role2', 'admin']  -- Empty array for public
);
```

## Troubleshooting

### pgvector Extension Not Found

```sql
-- Enable the extension manually
CREATE EXTENSION vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### RLS Blocking Queries

Row Level Security policies require `auth.uid()` to work. When using the service role key, RLS is automatically bypassed. For testing with psql:

```sql
-- Temporarily disable RLS for testing
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Re-enable when done
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
```

### Index Build Fails

If IVFFlat index creation fails due to insufficient data:

```sql
-- Drop the index
DROP INDEX IF EXISTS idx_documents_embedding;

-- Add at least 100 documents first, then recreate:
CREATE INDEX idx_documents_embedding ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Backup and Restore

### Backup

```bash
# Backup entire database
pg_dump $SUPABASE_DB_URL > backup.sql

# Backup specific tables
pg_dump $SUPABASE_DB_URL -t users -t sop_permissions > backup_users.sql
```

### Restore

```bash
psql $SUPABASE_DB_URL < backup.sql
```

## Next Steps

1. ✅ Run all migrations
2. ✅ Seed sample data
3. ✅ Verify tables and indexes
4. 📝 Configure backend environment variables
5. 📝 Test authentication with sample users
6. 📝 Upload your actual SOP documents
7. 📝 Configure real SOP permissions
8. 📝 Change default passwords

## Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Use strong, unique passwords for each user
- [ ] Review and adjust RLS policies
- [ ] Set appropriate index parameters based on data size
- [ ] Configure automated backups
- [ ] Enable connection pooling
- [ ] Review and restrict database access
- [ ] Set up monitoring and alerts
- [ ] Document your custom SOP permissions
- [ ] Test all role-based access scenarios

## Support

For issues or questions:
1. Check the main README.md
2. Review Supabase documentation: https://supabase.com/docs
3. Check pgvector documentation: https://github.com/pgvector/pgvector
