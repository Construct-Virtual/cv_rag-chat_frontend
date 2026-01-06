# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added - 2026-01-04

#### Frontend Infrastructure (F3-F31)

**Types System (F3-F7)**
- `frontend/types/user.ts` - User, UserRole, AuthTokens, LoginRequest, LoginResponse types
- `frontend/types/conversation.ts` - Conversation, ConversationCreate, ConversationUpdate, ShareResponse types
- `frontend/types/message.ts` - Message, MessageRole, Source, MessageCreate, StreamEvent types
- `frontend/types/api.ts` - ApiError, ApiResponse, PaginatedResponse, HealthCheckResponse types
- `frontend/types/index.ts` - Barrel export for all types

**State Management (F8-F11)**
- `frontend/stores/authStore.ts` - Zustand store with persist middleware for auth state
- `frontend/stores/conversationStore.ts` - Zustand store for conversations, messages, and streaming state
- `frontend/lib/AuthContext.tsx` - React context provider wrapping Zustand auth store
- `frontend/lib/utils.ts` - Utility functions: cn(), formatRelativeTime(), formatDate(), groupByTimePeriod(), truncate(), copyToClipboard(), debounce()

**Custom Hooks (F12-F14)**
- `frontend/hooks/useAuth.ts` - useAuthActions() for login/logout, useAuthState() for reading auth
- `frontend/hooks/useChatStream.ts` - SSE streaming hook with sendMessage() and regenerateMessage()
- `frontend/hooks/useToast.ts` - useToast() for multiple toasts, useSimpleToast() for single toast
- `frontend/hooks/index.ts` - Barrel export

**Core Components (F15-F21)**
- `frontend/components/Button.tsx` - Variants: primary, secondary, ghost, danger, icon; sizes: sm, md, lg
- `frontend/components/Input.tsx` - Text input with label, error, and helper text support
- `frontend/components/Modal.tsx` - Accessible modal with backdrop blur, escape key, focus trap
- `frontend/components/Toast.tsx` - Toast and ToastContainer for notifications
- `frontend/components/Skeleton.tsx` - Skeleton loaders: base, MessageSkeleton, ConversationSkeleton, ChatSkeleton
- `frontend/components/ErrorBoundary.tsx` - Class-based error boundary with ErrorDisplay functional component
- `frontend/components/ProtectedRoute.tsx` - Route protection wrapper with loading state

**Layout Components (F22-F24)**
- `frontend/components/Header.tsx` - App header with sidebar toggle, branding, user info, logout
- `frontend/components/Sidebar.tsx` - Conversation list with search, new chat button, time period grouping
- `frontend/components/ConversationItem.tsx` - Single conversation with hover actions (rename, delete)

**Chat Components (F25-F31)**
- `frontend/components/MessageList.tsx` - Scrollable message container with auto-scroll
- `frontend/components/MessageBubble.tsx` - Message display with copy/regenerate actions, timestamp on hover
- `frontend/components/ChatInput.tsx` - Textarea with character counter, Enter to send, Shift+Enter for newline
- `frontend/components/SourceCitation.tsx` - Expandable citation with excerpt preview
- `frontend/components/TypingIndicator.tsx` - Animated bouncing dots
- `frontend/components/EmptyState.tsx` - EmptyState, ChatEmptyState, WelcomeState variants
- `frontend/components/SuggestedPrompts.tsx` - Clickable prompt suggestions

**Styling Updates**
- `frontend/app/globals.css` - Added animations: fade-in, scale-in, shimmer

### Fixed
- TypeScript error in `app/utils/api.ts` - Changed HeadersInit to Record<string, string>
- TypeScript error in `app/chat/page.tsx` - Changed share_token null to undefined
