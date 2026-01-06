# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Start PostgreSQL with pgvector
docker-compose up -d postgres

# Initialize database (migrations + seeds + embeddings)
cd backend
python scripts/init_db.py migrate && python scripts/init_db.py seed
python scripts/embed_documents.py

# Run backend (in backend/ with venv activated)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run frontend (separate terminal)
cd frontend && pnpm dev
```

**Test credentials:** `admin` / `password123` (also: hr_manager, finance_manager, employee, manager)

## Commands

### Testing

```bash
# Backend tests
cd backend && pytest
pytest tests/test_auth.py::test_login -v  # Single test

# Frontend
cd frontend && pnpm type-check && pnpm lint

# Feature tracking
cat feature_list.json | jq '[.[] | select(.passes==true)] | length'  # Count passing
```

### Port Management (Windows)

```bash
netstat -ano | findstr :8000        # Find process on port
taskkill /PID <pid> /F              # Kill by PID
```

### Verification

```bash
curl http://localhost:8000/api/health     # Health check
curl http://localhost:8000/api/health/db  # Database connectivity
# OpenAPI docs: http://localhost:8000/docs
```

## Architecture

```text
User → Frontend (Next.js :3000) → Backend API (FastAPI :8000) → PostgreSQL+pgvector (:5432)
                                         ↓
                                   OpenAI API (embeddings + LLM)
```

### Backend Service Layer

```text
Routers (HTTP)           Services (Business logic)        External
├── auth.py          →   database_service.py          →   PostgreSQL (psycopg2)
└── chat.py          →   rag_service.py               →   OpenAI API + pgvector
```

**Key patterns:**

- Routers delegate to services; no business logic in routers
- All database operations use `sop_*` prefixed tables (isolation from other systems)
- RAG pipeline: query → embedding → pgvector search → role-based filtering → LangChain → SSE streaming

### Frontend State Management

- **authStore** (Zustand, persisted): User authentication state
- **conversationStore** (Zustand, in-memory): Conversations and messages
- **API client** (`app/utils/api.ts`): Auto token refresh on 401

### Database Tables

All chat system tables use `sop_` prefix for isolation:

| Table | Purpose |
|-------|---------|
| `sop_users` | User accounts and authentication |
| `sop_conversations` | Chat conversation metadata |
| `sop_messages` | Individual messages with sources |
| `sop_refresh_tokens` | JWT refresh token storage |
| `sop_permissions` | Role-based document access control |
| `documents` | Vector embeddings (**shared**, no prefix) |

**CRITICAL**: Only modify `sop_*` tables. The `documents` table is shared with other systems.

## Key Implementation Details

### SSE Streaming Format

```text
data: {"type": "token", "content": "..."}\n\n
data: {"type": "complete", "sources": [...]}\n\n
```

### Token Refresh Flow

1. Access tokens in Authorization header (30 min expiry)
2. Refresh tokens in httpOnly cookies (7 day expiry)
3. On 401 → Frontend calls `/api/auth/refresh` → New access token
4. Refresh tokens stored in database, invalidated on logout

### Permission Filtering

Role-based document access controlled via `match_documents_with_permissions()` PostgreSQL function. Filtering happens at database level, not application level.

## Tech Stack Notes

- **Embedding Model**: text-embedding-3-small (1536 dims) - changed from 3-large due to pgvector IVFFlat limits
- **Tailwind CSS 4.0**: Uses `@tailwindcss/postcss` architecture (different from v3)
- **Database**: Direct PostgreSQL connection via psycopg2 (not full Supabase stack, no RLS)

## Development Workflows

### Adding a Backend Endpoint

1. Add route handler in `backend/app/routers/auth.py` or `chat.py`
2. Use Pydantic models for request/response validation
3. Call service methods (no business logic in routers)
4. **CRITICAL**: Uvicorn `--reload` may not detect new `@router` decorators - fully restart backend if endpoint not appearing in `/docs`

### Adding a UI Component

1. Create in `frontend/components/ComponentName.tsx`
2. Follow existing patterns (Button variants, Modal structure)
3. Use Tailwind utility classes
4. Export from `frontend/components/index.ts` if reusable

### Debugging

```bash
# Test PostgreSQL connection
docker exec -it cv_rag_postgres psql -U postgres -d cv_rag_chat

# Useful SQL
\dt sop_*                                    # List SOP tables
SELECT username, role FROM sop_users;        # Check users
SELECT COUNT(*) FROM documents;              # Count embeddings
```

## Boundaries

### feature_list.json Rules

- NEVER remove features or edit descriptions
- ONLY change `"passes": false` → `"passes": true` after thorough testing

### Development Rules

1. Never guess package APIs - search for latest documentation
2. Read existing code before making modifications
3. Test features thoroughly before marking as passing
4. Think of edge cases; critique initial plans before finalizing

### Testing Guidelines

- **Frontend**: Use Playwright MCP tools for UI testing
- **Backend**: Use curl for API endpoint testing
- **Integration**: Verify full flow from frontend through to database

## Key Files

| File | Purpose |
| ---- | ------- |
| `todo.md` | Task tracking (single source of truth) |
| `feature_list.json` | Feature specifications and pass/fail status |
| `app_spec.txt` | Complete project specification |
| `.claude/learnings.md` | Solutions to encountered problems |
| `architecture.md` | Detailed architecture documentation |

## Known Issues

See [.claude/learnings.md](.claude/learnings.md) for solutions to common problems:

- **Uvicorn reload fails for new endpoints**: Fully restart server for new @router decorators
- **N+1 query performance**: Use JOINed queries for remote databases (Supabase)
- **Bcrypt hash corruption**: Use Python parameterized queries, not psql command line
