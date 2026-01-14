# Agent Learnings

Solutions to problems encountered during development.
**Check this file FIRST when you encounter errors.**

## Quick Reference

- [In-Memory Database](#backend-in-memory-database-restart-data-loss) - Data loss on server restart
- [Function Signature Mismatch](#backend-function-signature-mismatch) - TypeError from missing parameters
- [Response Model Missing Fields](#api-response-model-missing-fields) - Data not returned in API
- [Uvicorn Reload Issues](#server-uvicorn-auto-reload-not-registering-new-endpoints) - 404 for new endpoints
- [Wrong Backend Port](#frontend-wrong-backend-port) - Frontend data inconsistency
- [Bcrypt Hash Mismatch](#auth-bcrypt-password-hash-mismatch) - Invalid credentials on login
- [Skip Navigation Link](#accessibility-skip-navigation-link-implementation) - Keyboard accessibility
- [ARIA Live Regions](#accessibility-aria-live-regions-for-dynamic-content) - Screen reader announcements
- [Color Contrast](#accessibility-wcag-aa-color-contrast-verification) - WCAG AA compliance
- [LLM Markdown Newlines](#frontend-llm-markdown-output-missing-newlines) - Inline headings/lists fix

---

## Error Solutions

### [Backend] In-Memory Database Restart Data Loss
**Error:** `404 Not Found` or `Message not found` errors after server restart
**Context:** FastAPI with uvicorn --reload, in-memory mock database
**Solution:**
1. Remember that in-memory databases (like MockDatabase) lose ALL data when server restarts
2. After backend restart, old message/conversation IDs from frontend become invalid
3. To test features requiring existing data, create NEW data after server starts
4. Don't rely on old IDs from before restart
**Verified:** Session 19, commit 3316b88
**Tags:** uvicorn, reload, in-memory, database, 404

### [Backend] Function Signature Mismatch
**Error:** `TypeError` when calling function with parameter it doesn't accept
**Context:** Python function called with keyword argument not in signature
**Solution:**
1. Check function signature matches all call sites
2. Add optional parameters with default values: `param: Type = None`
3. Use grep to find all call sites: `grep -r "function_name(" .`
4. Update function signature before updating callers
**Verified:** Session 19, commit 3316b88
**Tags:** python, function, parameters, TypeError

### [API] Response Model Missing Fields
**Error:** Data exists in database but not returned in API response
**Context:** Pydantic BaseModel used as response_model in FastAPI
**Solution:**
1. Check that Pydantic model includes all fields you want to return
2. Verify field names match between database and model
3. Add optional fields with defaults: `field: Type = []`
4. Update endpoint to include new fields when constructing response
**Verified:** Session 19, commit 3316b88
**Tags:** fastapi, pydantic, response-model, api

### [Server] Uvicorn Auto-Reload Not Registering New Endpoints
**Error:** `404 Not Found` for endpoints that exist in code but not in runtime
**Context:** FastAPI with uvicorn --reload, new @router decorators added to existing router file
**Solution:**
1. Check if endpoint exists in code: `grep "@router" backend/app/routers/chat.py`
2. Check if endpoint registered: Visit http://localhost:8000/docs
3. If endpoint in code but not in docs, uvicorn reload failed
4. MUST fully restart backend server (not just reload)
5. Stop server completely and restart via init.sh
6. Verify endpoints appear in /docs after restart
**Root Cause:** Uvicorn's --reload feature sometimes fails to re-import modules properly, especially when new route decorators are added. File changes are detected but the Python process doesn't fully reload the module.
**Verified:** Session 19, Session 20
**Tags:** uvicorn, fastapi, reload, 404, endpoints, router

### [Frontend] Wrong Backend Port
**Error:** Frontend shows old/stale data or data inconsistency between frontend and database
**Context:** Next.js frontend with NEXT_PUBLIC_API_URL environment variable
**Solution:**
1. Check frontend `.env.local` for `NEXT_PUBLIC_API_URL`
2. Verify it points to correct backend port (Docker: 8000, local dev may vary)
3. Check `docker ps` to see which ports are exposed
4. Use `mcp__browser_network_requests` to see which backend the frontend is actually calling
5. After updating `.env.local`, restart Next.js dev server for changes to take effect
**Root Cause:** Multiple backends may be running on different ports. Frontend may be pointing to an old/mock backend.
**Verified:** Session 24
**Tags:** frontend, nextjs, env, ports, docker

### [Auth] Bcrypt Password Hash Mismatch
**Error:** `Invalid credentials` or `Invalid salt` on login
**Context:** PostgreSQL with bcrypt password hashes in seed files
**Solution:**
1. Old hash in seed file may not match the password
2. Generate new hash: `python -c "import bcrypt; print(bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode())"`
3. Update hash in database: `UPDATE users SET password_hash = 'new_hash'`
4. Update seed files for future deployments
5. Avoid shell escaping issues when using psql - use Python to update instead
**Root Cause:** Seed file hash may have been generated with different salt or the original password was different.
**Verified:** Session 24
**Tags:** auth, bcrypt, password, login, seed

### [Accessibility] Skip Navigation Link Implementation

**Error:** Keyboard users cannot skip repetitive navigation to reach main content
**Context:** React/Next.js application with header and sidebar navigation
**Solution:**

1. Add skip link as first focusable element with sr-only class
2. Add id to main content area with tabIndex={-1}
3. Use sr-only for visually hidden but screen reader accessible
4. On focus, show link with absolute positioning at top of page
5. Include visible focus styles with focus:ring-2

**Verified:** Session 25 (Phase 16: Accessibility)
**Tags:** accessibility, keyboard, navigation, skip-link, WCAG

### [Accessibility] ARIA Live Regions for Dynamic Content

**Error:** Screen readers don't announce dynamically updated content (streaming, toasts)
**Context:** Chat application with SSE streaming responses, toast notifications
**Solution:**

1. Add role="status" and aria-live="polite" to streaming message containers
2. Use role="alert" for toast notifications (auto-announced)
3. Add aria-busy="true" to typing indicators
4. Include aria-atomic="true" for character counters that should read as complete units
5. Use aria-hidden="true" on decorative animations (bouncing dots, spinners)

**Verified:** Session 25 (Phase 16: Accessibility)
**Tags:** accessibility, aria, live-region, screen-reader, streaming

### [Accessibility] WCAG AA Color Contrast Verification

**Error:** Text may be hard to read for users with low vision
**Context:** Light and dark theme with CSS variables
**Solution:**

1. Normal text requires 4.5:1 contrast ratio against background
2. Large text (18pt+ or 14pt bold) requires 3:1 contrast ratio
3. Use online contrast checker (WebAIM) or browser dev tools
4. Dark theme: light text (#F5F5F5) on dark bg (#0A0A0A) = 18.5:1
5. Light theme: dark text (#111827) on white bg (#FFFFFF) = 17.5:1
6. Muted text must still meet 4.5:1 - adjust grays accordingly

**Verified:** Session 25 (Phase 16: Accessibility)
**Tags:** accessibility, WCAG, contrast, color, theme

### [Database] SOP Tables Manual Creation Required

**Error:** `relation "sop_users" does not exist` when calling login endpoint
**Context:** PostgreSQL database with migration 006_create_sop_tables.sql
**Solution:**

1. Migration file exists but needs manual execution
2. Create tables via direct psql commands or Python script
3. Use parameterized queries in Python to insert bcrypt hashes
4. Avoid inserting hashes via psql with dollar signs (causes corruption)
5. Copy data from old users table: `INSERT INTO sop_users SELECT * FROM users`

**Root Cause:** Migration script not automatically applied during database initialization
**Verified:** Test Phase 2
**Tags:** postgresql, migration, sop_tables, bcrypt

### [Auth] Bcrypt Hash Corruption with psql Dollar Signs

**Error:** `Invalid salt` when verifying bcrypt password hash
**Context:** Inserting bcrypt hashes into PostgreSQL via psql command line
**Solution:**

1. Don't insert bcrypt hashes via psql with escaped dollar signs
2. Use Python with psycopg2 and parameterized queries instead
3. Bcrypt hashes have format `$2b$12$...` (60 characters)
4. Check hash length: `SELECT LENGTH(password_hash) FROM users` should be 60
5. Copy working hashes from existing tables when possible

**Root Cause:** Shell and psql interpret backslashes and dollar signs, corrupting the hash
**Verified:** Test Phase 2
**Tags:** auth, bcrypt, postgresql, psql, python

### [Performance] N+1 Query Problem with Remote Databases

**Error:** API endpoint takes 65-70 seconds to respond
**Context:** FastAPI with psycopg2 connecting to Supabase PgBouncer, conversation list endpoint
**Solution:**

1. Identify N+1 pattern: main query + N additional queries per result
2. Replace multiple queries with single JOINed query
3. Use LATERAL JOIN for "latest row per group" patterns (e.g., last message per conversation)
4. Add timing logs to measure actual query time vs connection overhead
5. Example optimized query:

```sql
SELECT c.*,
       COALESCE(msg_stats.message_count, 0) as message_count,
       last_msg.content as last_message_content
FROM conversations c
LEFT JOIN (SELECT conversation_id, COUNT(*) FROM messages GROUP BY conversation_id) msg_stats ON c.id = msg_stats.conversation_id
LEFT JOIN LATERAL (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) last_msg ON true
WHERE c.user_id = %s
ORDER BY c.updated_at DESC
LIMIT %s OFFSET %s
```

**Root Cause:** Each database call to Supabase PgBouncer takes ~1.7 seconds. With 22 conversations x 2 extra queries each = 45 queries = ~70 seconds total.
**Verified:** Fix Phase 1
**Tags:** performance, N+1, postgresql, supabase, pgbouncer, latency

### [Performance] psycopg2 Connection Pooling

**Error:** Slow response times due to connection establishment overhead
**Context:** psycopg2 connecting to remote PostgreSQL (Supabase)
**Solution:**

1. Import ThreadedConnectionPool from psycopg2.pool
2. Initialize pool in service __init__ with minconn=2, maxconn=10
3. Use contextmanager to get/return connections from pool
4. Fall back to direct connection if pool unavailable

```python
from psycopg2 import pool

class DatabaseService:
    def __init__(self):
        self._pool = pool.ThreadedConnectionPool(
            minconn=2, maxconn=10,
            dsn=self.database_url,
            connect_timeout=10
        )

    @contextmanager
    def get_connection(self):
        conn = self._pool.getconn()
        try:
            yield conn
            conn.commit()
        finally:
            self._pool.putconn(conn)
```

**Verified:** Fix Phase 1
**Tags:** performance, psycopg2, connection-pool, postgresql

### [Frontend] LLM Markdown Output Missing Newlines

**Error:** Markdown headings, lists, and code blocks render inline instead of as separate blocks
**Context:** RAG chat with LLM (GPT-4) output rendered via react-markdown
**Solution:**

1. LLMs often output markdown without proper newlines between elements
2. Create a post-processor (`markdown-processor.ts`) that runs regex replacements
3. Detect inline patterns like `[.!?:;]\s+(#{1,6}\s+)` (punctuation followed by heading)
4. Insert double newlines before headings, lists, blockquotes
5. CRITICAL: Protect code blocks before processing to prevent `#` comments being parsed as headings:

```typescript
// Step 1: Fix code fences to be on their own lines
processed = processed.replace(/([^\n`])(```)/g, '$1\n\n$2');

// Step 2: Extract and protect code blocks
const codeBlocks: string[] = [];
processed = processed.replace(/```[\s\S]*?```/g, (match) => {
  codeBlocks.push(match);
  return '___CODE_BLOCK_' + (codeBlocks.length - 1) + '___';
});

// Step 3: Process non-code content (headings, lists, etc.)
processed = processed.replace(/([.!?:;])\s+(#{1,6}\s+)/g, '$1\n\n$2');

// Step 4: Restore code blocks
codeBlocks.forEach((block, index) => {
  processed = processed.replace('___CODE_BLOCK_' + index + '___', block);
});
```

6. For streaming: Check if inside unclosed code block (odd number of ```) and skip processing

**Root Cause:** LLMs prioritize semantic content over formatting. They may output `sentence. ## Heading` instead of `sentence.\n\n## Heading`.
**Verified:** Markdown styling session
**Tags:** markdown, react-markdown, LLM, post-processing, code-blocks

---

<!--
TEMPLATE FOR NEW ENTRIES:

### [Category] Problem Title
**Error:** `exact error message or pattern`
**Context:** technology stack, situation
**Solution:**
1. Step one
2. Step two
**Verified:** Session N, commit hash
**Tags:** keyword1, keyword2
-->
