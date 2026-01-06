"""Database service for PostgreSQL operations with connection pooling"""
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from contextlib import contextmanager
import time

from app.config import settings


class DatabaseService:
    """PostgreSQL database service with connection pooling for improved performance"""

    def __init__(self):
        self.database_url = settings.database_url
        # Initialize connection pool - min 2, max 10 connections
        # This dramatically reduces latency by reusing connections
        print("[DB] Initializing connection pool...")
        try:
            self._pool = pool.ThreadedConnectionPool(
                minconn=2,
                maxconn=10,
                dsn=self.database_url,
                connect_timeout=10,
                options='-c statement_timeout=30000'  # 30 second query timeout
            )
            print("[DB] Connection pool initialized successfully")
        except Exception as e:
            print(f"[DB] WARNING: Failed to create connection pool: {e}")
            self._pool = None

    @contextmanager
    def get_connection(self):
        """Get a database connection from pool with automatic cleanup"""
        start_time = time.time()
        conn = None

        if self._pool:
            # Use pooled connection
            try:
                conn = self._pool.getconn()
                get_time = time.time() - start_time
                if get_time > 0.1:  # Log slow connection gets
                    print(f"[DB] Pool getconn took {get_time:.3f}s")
            except Exception as e:
                print(f"[DB] Pool getconn failed: {e}, falling back to direct connect")
                conn = None

        if not conn:
            # Fallback to direct connection if pool not available
            conn = psycopg2.connect(
                self.database_url,
                connect_timeout=10,
                options='-c statement_timeout=30000'
            )

        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            if self._pool and conn:
                self._pool.putconn(conn)
            elif conn:
                conn.close()

    @contextmanager
    def get_cursor(self):
        """Get a database cursor with automatic cleanup"""
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            try:
                yield cursor
            finally:
                cursor.close()

    # ==================== User Methods ====================

    def find_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Find user by username"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username, password_hash, full_name, email, role,
                       avatar_url, is_active, created_at, updated_at, last_login
                FROM sop_users
                WHERE username = %s AND is_active = true
                """,
                (username,)
            )
            row = cursor.fetchone()
            return self._format_user(row) if row else None

    def find_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Find user by ID"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, username, password_hash, full_name, email, role,
                       avatar_url, is_active, created_at, updated_at, last_login
                FROM sop_users
                WHERE id = %s AND is_active = true
                """,
                (user_id,)
            )
            row = cursor.fetchone()
            return self._format_user(row) if row else None

    def update_user_last_login(self, user_id: str) -> None:
        """Update user's last login timestamp"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                UPDATE sop_users
                SET last_login = %s, updated_at = %s
                WHERE id = %s
                """,
                (datetime.utcnow(), datetime.utcnow(), user_id)
            )

    # ==================== Refresh Token Methods ====================

    def create_refresh_token(self, user_id: str, token: str, expires_at: datetime) -> Dict[str, Any]:
        """Store refresh token"""
        token_id = str(uuid.uuid4())
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO sop_refresh_tokens (id, user_id, token, expires_at, created_at)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, token, expires_at, created_at
                """,
                (token_id, user_id, token, expires_at, datetime.utcnow())
            )
            row = cursor.fetchone()
            return self._format_refresh_token(row)

    def find_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Find refresh token"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, token, expires_at, created_at
                FROM sop_refresh_tokens
                WHERE token = %s
                """,
                (token,)
            )
            row = cursor.fetchone()
            return self._format_refresh_token(row) if row else None

    def verify_refresh_token(self, user_id: str, token: str) -> bool:
        """Verify refresh token exists for user and is not expired"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT 1 FROM sop_refresh_tokens
                WHERE token = %s AND user_id = %s AND expires_at > %s
                """,
                (token, user_id, datetime.utcnow())
            )
            return cursor.fetchone() is not None

    def delete_refresh_token(self, token: str) -> None:
        """Delete refresh token"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM sop_refresh_tokens WHERE token = %s",
                (token,)
            )

    # ==================== Conversation Methods ====================

    def create_conversation(self, user_id: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Create a new conversation"""
        conv_id = str(uuid.uuid4())
        now = datetime.utcnow()
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO sop_conversations (id, user_id, title, created_at, updated_at, is_shared, share_token)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, user_id, title, created_at, updated_at, is_shared, share_token
                """,
                (conv_id, user_id, title or "New Conversation", now, now, False, None)
            )
            row = cursor.fetchone()
            return self._format_conversation(row)

    def find_conversations_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Find all conversations for a user"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, title, created_at, updated_at, is_shared, share_token
                FROM sop_conversations
                WHERE user_id = %s
                ORDER BY updated_at DESC
                """,
                (user_id,)
            )
            rows = cursor.fetchall()
            return [self._format_conversation(row) for row in rows]

    def find_conversations_by_user_optimized(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Find all conversations for a user with message counts and last message preview.
        Uses a single optimized query instead of N+1 queries for dramatically better performance.

        Args:
            user_id: The user's ID
            limit: Maximum number of conversations to return (default: 20)
            offset: Number of conversations to skip (default: 0)

        Returns:
            List of conversations with message_count, last_message_preview, and last_message_at
        """
        start_time = time.time()

        with self.get_cursor() as cursor:
            # Single query with subqueries for message_count and last_message
            # This eliminates the N+1 query problem
            cursor.execute(
                """
                SELECT
                    c.id,
                    c.user_id,
                    c.title,
                    c.created_at,
                    c.updated_at,
                    c.is_shared,
                    c.share_token,
                    COALESCE(msg_stats.message_count, 0) as message_count,
                    last_msg.content as last_message_content,
                    last_msg.created_at as last_message_at
                FROM sop_conversations c
                LEFT JOIN (
                    SELECT conversation_id, COUNT(*) as message_count
                    FROM sop_messages
                    GROUP BY conversation_id
                ) msg_stats ON c.id = msg_stats.conversation_id
                LEFT JOIN LATERAL (
                    SELECT content, created_at
                    FROM sop_messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) last_msg ON true
                WHERE c.user_id = %s
                ORDER BY c.updated_at DESC
                LIMIT %s OFFSET %s
                """,
                (user_id, limit, offset)
            )
            rows = cursor.fetchall()

        query_time = time.time() - start_time
        print(f"[DB] find_conversations_by_user_optimized query took {query_time:.3f}s, returned {len(rows)} rows")

        result = []
        for row in rows:
            # Build last message preview (truncate to 60 chars)
            last_message_preview = None
            if row.get("last_message_content"):
                content = row["last_message_content"]
                last_message_preview = content[:60] + "..." if len(content) > 60 else content

            result.append({
                "id": str(row["id"]),
                "user_id": str(row["user_id"]),
                "title": row["title"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                "is_shared": row["is_shared"],
                "share_token": row["share_token"],
                "message_count": row["message_count"],
                "last_message_preview": last_message_preview,
                "last_message_at": row["last_message_at"].isoformat() if row.get("last_message_at") else None
            })

        return result

    def find_conversation_by_id(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Find conversation by ID"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, title, created_at, updated_at, is_shared, share_token
                FROM sop_conversations
                WHERE id = %s
                """,
                (conversation_id,)
            )
            row = cursor.fetchone()
            return self._format_conversation(row) if row else None

    def update_conversation(self, conversation_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update conversation fields"""
        allowed_fields = {'title', 'is_shared', 'share_token'}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return self.find_conversation_by_id(conversation_id)

        set_clause = ", ".join([f"{k} = %s" for k in updates.keys()])
        values = list(updates.values()) + [datetime.utcnow(), conversation_id]

        with self.get_cursor() as cursor:
            cursor.execute(
                f"""
                UPDATE sop_conversations
                SET {set_clause}, updated_at = %s
                WHERE id = %s
                RETURNING id, user_id, title, created_at, updated_at, is_shared, share_token
                """,
                values
            )
            row = cursor.fetchone()
            return self._format_conversation(row) if row else None

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete conversation and its messages (cascade)"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM sop_conversations WHERE id = %s RETURNING id",
                (conversation_id,)
            )
            return cursor.fetchone() is not None

    def get_message_count(self, conversation_id: str) -> int:
        """Get count of messages in a conversation"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) as count FROM sop_messages WHERE conversation_id = %s",
                (conversation_id,)
            )
            row = cursor.fetchone()
            return row['count'] if row else 0

    def get_last_message(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get the most recent message in a conversation"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, conversation_id, role, content, sources, created_at
                FROM sop_messages
                WHERE conversation_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (conversation_id,)
            )
            row = cursor.fetchone()
            return self._format_message(row) if row else None

    def enable_conversation_sharing(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Enable sharing for a conversation and generate share token"""
        share_token = str(uuid.uuid4())
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                UPDATE sop_conversations
                SET is_shared = true, share_token = %s, updated_at = %s
                WHERE id = %s AND (is_shared = false OR share_token IS NULL)
                RETURNING id, user_id, title, created_at, updated_at, is_shared, share_token
                """,
                (share_token, datetime.utcnow(), conversation_id)
            )
            row = cursor.fetchone()
            if row:
                return self._format_conversation(row)
            # If no update happened, conversation already shared, return existing
            return self.find_conversation_by_id(conversation_id)

    def disable_conversation_sharing(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Disable sharing for a conversation"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                UPDATE sop_conversations
                SET is_shared = false, share_token = NULL, updated_at = %s
                WHERE id = %s
                RETURNING id, user_id, title, created_at, updated_at, is_shared, share_token
                """,
                (datetime.utcnow(), conversation_id)
            )
            row = cursor.fetchone()
            return self._format_conversation(row) if row else None

    def find_conversation_by_share_token(self, share_token: str) -> Optional[Dict[str, Any]]:
        """Find a shared conversation by its share token"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, user_id, title, created_at, updated_at, is_shared, share_token
                FROM sop_conversations
                WHERE share_token = %s AND is_shared = true
                """,
                (share_token,)
            )
            row = cursor.fetchone()
            return self._format_conversation(row) if row else None

    # ==================== Message Methods ====================

    def create_message(self, conversation_id: str, role: str, content: str,
                      sources: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a new message"""
        import json
        msg_id = str(uuid.uuid4())
        now = datetime.utcnow()
        sources_json = json.dumps(sources) if sources else json.dumps([])

        with self.get_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO sop_messages (id, conversation_id, role, content, sources, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, conversation_id, role, content, sources, created_at
                """,
                (msg_id, conversation_id, role, content, sources_json, now)
            )
            row = cursor.fetchone()

            # Update conversation timestamp
            cursor.execute(
                "UPDATE sop_conversations SET updated_at = %s WHERE id = %s",
                (now, conversation_id)
            )

            return self._format_message(row)

    def find_messages_by_conversation(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Find all messages in a conversation"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, conversation_id, role, content, sources, created_at
                FROM sop_messages
                WHERE conversation_id = %s
                ORDER BY created_at ASC
                """,
                (conversation_id,)
            )
            rows = cursor.fetchall()
            return [self._format_message(row) for row in rows]

    def find_message_by_id(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Find a message by ID"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, conversation_id, role, content, sources, created_at
                FROM sop_messages
                WHERE id = %s
                """,
                (message_id,)
            )
            row = cursor.fetchone()
            return self._format_message(row) if row else None

    def delete_message(self, message_id: str) -> bool:
        """Delete a message by ID"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "DELETE FROM sop_messages WHERE id = %s RETURNING id",
                (message_id,)
            )
            return cursor.fetchone() is not None

    # ==================== Health Check ====================

    def health_check(self) -> bool:
        """Check database connectivity"""
        try:
            with self.get_cursor() as cursor:
                cursor.execute("SELECT 1")
                return True
        except Exception:
            return False

    # ==================== Settings & User Management Methods ====================

    def update_user_profile(self, user_id: str, full_name: Optional[str] = None,
                           email: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update user profile (name and/or email)"""
        updates = []
        params = []

        if full_name is not None:
            updates.append("full_name = %s")
            params.append(full_name)

        if email is not None:
            updates.append("email = %s")
            params.append(email)

        if not updates:
            # Nothing to update, return current user
            return self.find_user_by_id(user_id)

        updates.append("updated_at = %s")
        params.append(datetime.utcnow())
        params.append(user_id)

        with self.get_cursor() as cursor:
            cursor.execute(
                f"""
                UPDATE sop_users
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING id, username, password_hash, full_name, email, role,
                          avatar_url, is_active, created_at, updated_at, last_login
                """,
                params
            )
            row = cursor.fetchone()
            return self._format_user(row) if row else None

    def update_user_password(self, user_id: str, password_hash: str) -> bool:
        """Update user password"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                UPDATE sop_users
                SET password_hash = %s, updated_at = %s
                WHERE id = %s
                """,
                (password_hash, datetime.utcnow(), user_id)
            )
            return cursor.rowcount > 0

    def find_all_users(self, search: Optional[str] = None,
                       limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Find all users with optional search and pagination (admin only)"""
        with self.get_cursor() as cursor:
            if search:
                cursor.execute(
                    """
                    SELECT id, username, password_hash, full_name, email, role,
                           avatar_url, is_active, created_at, updated_at, last_login
                    FROM sop_users
                    WHERE username ILIKE %s OR full_name ILIKE %s OR email ILIKE %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (f'%{search}%', f'%{search}%', f'%{search}%', limit, offset)
                )
            else:
                cursor.execute(
                    """
                    SELECT id, username, password_hash, full_name, email, role,
                           avatar_url, is_active, created_at, updated_at, last_login
                    FROM sop_users
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (limit, offset)
                )
            rows = cursor.fetchall()
            return [self._format_user(row) for row in rows]

    def count_users(self, search: Optional[str] = None) -> int:
        """Count total users with optional search filter"""
        with self.get_cursor() as cursor:
            if search:
                cursor.execute(
                    """
                    SELECT COUNT(*) as count
                    FROM sop_users
                    WHERE username ILIKE %s OR full_name ILIKE %s OR email ILIKE %s
                    """,
                    (f'%{search}%', f'%{search}%', f'%{search}%')
                )
            else:
                cursor.execute("SELECT COUNT(*) as count FROM sop_users")
            row = cursor.fetchone()
            return row['count'] if row else 0

    def create_user(self, username: str, password_hash: str, role: str,
                   full_name: Optional[str] = None, email: Optional[str] = None) -> Dict[str, Any]:
        """Create a new user (admin only)"""
        user_id = str(uuid.uuid4())
        now = datetime.utcnow()

        with self.get_cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO sop_users (id, username, password_hash, full_name, email, role,
                                      is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, true, %s, %s)
                RETURNING id, username, password_hash, full_name, email, role,
                          avatar_url, is_active, created_at, updated_at, last_login
                """,
                (user_id, username, password_hash, full_name, email, role, now, now)
            )
            row = cursor.fetchone()
            return self._format_user(row)

    def update_user(self, user_id: str, full_name: Optional[str] = None,
                   email: Optional[str] = None, role: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update user details (admin only)"""
        updates = []
        params = []

        if full_name is not None:
            updates.append("full_name = %s")
            params.append(full_name)

        if email is not None:
            updates.append("email = %s")
            params.append(email)

        if role is not None:
            updates.append("role = %s")
            params.append(role)

        if not updates:
            return self.find_user_by_id(user_id)

        updates.append("updated_at = %s")
        params.append(datetime.utcnow())
        params.append(user_id)

        with self.get_cursor() as cursor:
            cursor.execute(
                f"""
                UPDATE sop_users
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING id, username, password_hash, full_name, email, role,
                          avatar_url, is_active, created_at, updated_at, last_login
                """,
                params
            )
            row = cursor.fetchone()
            return self._format_user(row) if row else None

    def update_user_status(self, user_id: str, is_active: bool) -> Optional[Dict[str, Any]]:
        """Activate or deactivate user (admin only)"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """
                UPDATE sop_users
                SET is_active = %s, updated_at = %s
                WHERE id = %s
                RETURNING id, username, password_hash, full_name, email, role,
                          avatar_url, is_active, created_at, updated_at, last_login
                """,
                (is_active, datetime.utcnow(), user_id)
            )
            row = cursor.fetchone()
            return self._format_user(row) if row else None

    def delete_user(self, user_id: str) -> bool:
        """Delete user (admin only) - also deletes related conversations and messages via CASCADE"""
        with self.get_cursor() as cursor:
            cursor.execute("DELETE FROM sop_users WHERE id = %s", (user_id,))
            return cursor.rowcount > 0

    # ==================== Formatting Helpers ====================

    def _format_user(self, row: Dict) -> Dict[str, Any]:
        """Format user row to match mock interface"""
        return {
            "id": str(row["id"]),
            "username": row["username"],
            "password_hash": row["password_hash"],
            "full_name": row["full_name"],
            "email": row["email"],
            "role": row["role"],
            "avatar_url": row["avatar_url"],
            "is_active": row["is_active"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "last_login": row["last_login"].isoformat() if row["last_login"] else None
        }

    def _format_refresh_token(self, row: Dict) -> Dict[str, Any]:
        """Format refresh token row"""
        return {
            "id": str(row["id"]),
            "user_id": str(row["user_id"]),
            "token": row["token"],
            "expires_at": row["expires_at"].isoformat() if row["expires_at"] else None,
            "created_at": row["created_at"].isoformat() if row["created_at"] else None
        }

    def _format_conversation(self, row: Dict) -> Dict[str, Any]:
        """Format conversation row to match mock interface"""
        return {
            "id": str(row["id"]),
            "user_id": str(row["user_id"]),
            "title": row["title"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "is_shared": row["is_shared"],
            "share_token": row["share_token"]
        }

    def _format_message(self, row: Dict) -> Dict[str, Any]:
        """Format message row to match mock interface"""
        import json
        sources = row["sources"]
        if isinstance(sources, str):
            sources = json.loads(sources)
        elif sources is None:
            sources = []

        return {
            "id": str(row["id"]),
            "conversation_id": str(row["conversation_id"]),
            "role": row["role"],
            "content": row["content"],
            "sources": sources,
            "created_at": row["created_at"].isoformat() if row["created_at"] else None
        }


# Global database service instance
db = DatabaseService()
