# Architecture

## Overview

SOP AI Agent is a RAG-based chat application for querying company Standard Operating Procedures.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 16.1)                      │
│                              :3000                                   │
├─────────────────────────────────────────────────────────────────────┤
│  app/                    │  components/           │  stores/         │
│  ├── chat/page.tsx       │  ├── Button.tsx       │  ├── authStore   │
│  ├── login/page.tsx      │  ├── Modal.tsx        │  └── convStore   │
│  ├── shared/[token]/     │  ├── Header.tsx       │                  │
│  └── utils/api.ts        │  ├── Sidebar.tsx      │  hooks/          │
│                          │  ├── MessageList.tsx  │  ├── useAuth     │
│  types/                  │  ├── ChatInput.tsx    │  ├── useChatStream│
│  ├── user.ts             │  └── ...              │  └── useToast    │
│  ├── conversation.ts     │                       │                  │
│  └── message.ts          │  lib/                 │                  │
│                          │  ├── utils.ts         │                  │
│                          │  └── AuthContext.tsx  │                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/SSE
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI 0.128)                       │
│                              :8000                                   │
├─────────────────────────────────────────────────────────────────────┤
│  routers/                │  services/             │  utils/          │
│  ├── auth.py             │  ├── database_service  │  └── dependencies│
│  └── chat.py             │  └── rag_service       │                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│     PostgreSQL + pgvector    │    │         OpenAI API           │
│           :5432              │    │                              │
├──────────────────────────────┤    ├──────────────────────────────┤
│  sop_users                   │    │  text-embedding-3-small      │
│  sop_conversations           │    │  gpt-4o-mini                 │
│  sop_messages                │    │                              │
│  sop_refresh_tokens          │    │                              │
│  sop_permissions             │    │                              │
│  documents (shared vectors)  │    │                              │
└──────────────────────────────┘    └──────────────────────────────┘
```

## Frontend Architecture

### Directory Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── chat/page.tsx         # Main chat interface (~1200 lines, to be refactored)
│   ├── login/page.tsx        # Login form
│   ├── shared/[share_token]/ # Public shared conversations
│   ├── utils/api.ts          # API client with auto token refresh
│   ├── globals.css           # Global styles and animations
│   └── layout.tsx            # Root layout
│
├── components/               # Reusable UI components
│   ├── Button.tsx            # Button variants (primary, secondary, ghost, danger, icon)
│   ├── Input.tsx             # Form input with validation
│   ├── Modal.tsx             # Accessible modal dialog
│   ├── Toast.tsx             # Toast notifications
│   ├── Skeleton.tsx          # Loading skeleton components
│   ├── ErrorBoundary.tsx     # Error boundary wrapper
│   ├── ProtectedRoute.tsx    # Auth route protection
│   ├── Header.tsx            # App header with user menu
│   ├── Sidebar.tsx           # Conversation list sidebar
│   ├── ConversationItem.tsx  # Single conversation in sidebar
│   ├── MessageList.tsx       # Scrollable message container
│   ├── MessageBubble.tsx     # Individual message display
│   ├── ChatInput.tsx         # Message input with send
│   ├── SourceCitation.tsx    # Expandable citation chip
│   ├── TypingIndicator.tsx   # Animated typing dots
│   ├── EmptyState.tsx        # Empty state variations
│   ├── SuggestedPrompts.tsx  # Starter prompt buttons
│   └── index.ts              # Barrel exports
│
├── stores/                   # Zustand state management
│   ├── authStore.ts          # Auth state with persist
│   └── conversationStore.ts  # Conversations & messages
│
├── hooks/                    # Custom React hooks
│   ├── useAuth.ts            # Auth actions and state
│   ├── useChatStream.ts      # SSE streaming logic
│   ├── useToast.ts           # Toast notifications
│   └── index.ts              # Barrel exports
│
├── lib/                      # Shared utilities
│   ├── utils.ts              # cn(), formatDate(), etc.
│   └── AuthContext.tsx       # React context for auth
│
├── types/                    # TypeScript type definitions
│   ├── user.ts               # User, UserRole, AuthTokens
│   ├── conversation.ts       # Conversation types
│   ├── message.ts            # Message, Source types
│   ├── api.ts                # API response types
│   └── index.ts              # Barrel exports
│
└── package.json
```

### State Management

**Zustand Stores:**

1. **authStore** - Persisted to localStorage
   - `user: User | null`
   - `isAuthenticated: boolean`
   - `login(user, token)`, `logout()`, `initFromStorage()`

2. **conversationStore** - In-memory
   - `conversations: Conversation[]`
   - `currentConversation: Conversation | null`
   - `messages: Message[]`
   - `isStreaming, streamingContent, streamingSources`
   - CRUD actions for conversations and messages

### Authentication Flow

1. User submits credentials → `POST /api/auth/login`
2. Backend returns `access_token` (JWT) + sets `refresh_token` cookie
3. Frontend stores `access_token` in sessionStorage
4. API client adds `Authorization: Bearer <token>` header
5. On 401 → API client calls `POST /api/auth/refresh` (uses cookie)
6. If refresh succeeds → retry original request
7. If refresh fails → redirect to login with toast

### SSE Streaming

```typescript
// useChatStream hook handles:
1. POST /api/chat/query with message
2. Read response.body as stream
3. Parse "data: {...}" SSE events
4. Update streamingContent on "token" events
5. Finalize on "complete" event with sources
6. Handle "error" events
```

## Backend Architecture

### API Endpoints

**Auth (`/api/auth`)**
- `POST /login` - Authenticate user
- `POST /logout` - Invalidate refresh token
- `POST /refresh` - Get new access token
- `GET /me` - Get current user

**Chat (`/api/chat`)**
- `GET /conversations` - List user's conversations
- `POST /conversations` - Create conversation
- `GET /conversations/{id}` - Get conversation
- `PATCH /conversations/{id}` - Update title
- `DELETE /conversations/{id}` - Delete conversation
- `POST /conversations/{id}/share` - Enable sharing
- `DELETE /conversations/{id}/share` - Disable sharing
- `GET /conversations/{id}/messages` - Get messages
- `POST /query` - Send message (SSE streaming)
- `POST /messages/{id}/regenerate` - Regenerate response
- `GET /shared/{share_token}` - Get shared conversation

### Database Schema

**SOP System Tables (sop_* prefix)**

All chat system tables use the `sop_` prefix for isolation from other systems sharing the database:

```sql
-- Core chat system tables (SOP-prefixed)
sop_users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'employee',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP
)

sop_conversations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES sop_users(id),
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_shared BOOLEAN DEFAULT false,
    share_token TEXT UNIQUE
)

sop_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES sop_conversations(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMP,
    token_count INTEGER
)

sop_refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES sop_users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP
)

sop_permissions (
    id UUID PRIMARY KEY,
    file_name TEXT UNIQUE NOT NULL,
    display_name TEXT,
    description TEXT,
    allowed_roles TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    category TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID REFERENCES users(id)
)

-- Shared vector embeddings table (NO sop_ prefix)
documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(1536),  -- pgvector extension
    created_at TIMESTAMP
)
```

**Table Relationships:**
- `sop_users` ← `sop_conversations` (user_id)
- `sop_conversations` ← `sop_messages` (conversation_id)
- `sop_users` ← `sop_refresh_tokens` (user_id)
- `sop_permissions` controls access to `documents` via role-based filtering

**IMPORTANT**: Only modify tables with `sop_` prefix. The `documents` table is shared with other systems.

### RAG Pipeline

1. User query → generate embedding via OpenAI
2. Vector search in PostgreSQL (pgvector)
3. Filter by user role permissions
4. Build context from top-k chunks
5. Send to LLM (gpt-4o-mini) with system prompt
6. Stream response via SSE with source citations

## Design System

### Colors (Dark Theme)
- Background Primary: `#0A0A0A`
- Background Secondary: `#1A1A1A`
- Background Tertiary: `#2A2A2A`
- Accent Primary: `#3B82F6` (blue)
- Accent Secondary: `#8B5CF6` (purple)
- Text Primary: `#F5F5F5`
- Text Secondary: `#A1A1A1`
- Text Muted: `#737373`
- Border: `#2A2A2A`

### Typography
- Font Family: Inter (sans), JetBrains Mono (code)
- Base Size: 14px (text-sm)

### Spacing
- Header Height: 64px
- Sidebar Width: 300px (expanded)
