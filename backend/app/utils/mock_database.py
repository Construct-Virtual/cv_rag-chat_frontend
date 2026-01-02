"""Mock database for development without Supabase"""
from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid


class MockDatabase:
    """In-memory database for development"""

    def __init__(self):
        # Sample users with hashed password "password123"
        # Hash: $2b$12$sBXAKyCUtjImJcXvJ4iUeOdxG0xcBrYEcLA/t6XGitOon63H/Zy52
        self.users = [
            {
                "id": str(uuid.uuid4()),
                "username": "admin",
                "password_hash": "$2b$12$sBXAKyCUtjImJcXvJ4iUeOdxG0xcBrYEcLA/t6XGitOon63H/Zy52",
                "full_name": "System Administrator",
                "email": "admin@company.com",
                "role": "admin",
                "is_active": True,
                "avatar_url": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "last_login": None
            },
            {
                "id": str(uuid.uuid4()),
                "username": "hr_manager",
                "password_hash": "$2b$12$sBXAKyCUtjImJcXvJ4iUeOdxG0xcBrYEcLA/t6XGitOon63H/Zy52",
                "full_name": "Jane Smith",
                "email": "jane.smith@company.com",
                "role": "hr",
                "is_active": True,
                "avatar_url": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "last_login": None
            },
            {
                "id": str(uuid.uuid4()),
                "username": "employee",
                "password_hash": "$2b$12$sBXAKyCUtjImJcXvJ4iUeOdxG0xcBrYEcLA/t6XGitOon63H/Zy52",
                "full_name": "Alice Johnson",
                "email": "alice.johnson@company.com",
                "role": "employee",
                "is_active": True,
                "avatar_url": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "last_login": None
            }
        ]
        self.refresh_tokens = []
        self.conversations = []
        self.messages = []

    def find_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Find user by username"""
        for user in self.users:
            if user["username"] == username and user["is_active"]:
                return user.copy()
        return None

    def find_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Find user by ID"""
        for user in self.users:
            if user["id"] == user_id and user["is_active"]:
                return user.copy()
        return None

    def update_user_last_login(self, user_id: str) -> None:
        """Update user's last login timestamp"""
        for user in self.users:
            if user["id"] == user_id:
                user["last_login"] = datetime.utcnow().isoformat()
                user["updated_at"] = datetime.utcnow().isoformat()
                break

    def create_refresh_token(self, user_id: str, token: str, expires_at: datetime) -> Dict[str, Any]:
        """Store refresh token"""
        refresh_token = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "token": token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }
        self.refresh_tokens.append(refresh_token)
        return refresh_token

    def find_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Find refresh token"""
        for rt in self.refresh_tokens:
            if rt["token"] == token:
                return rt.copy()
        return None

    def delete_refresh_token(self, token: str) -> None:
        """Delete refresh token"""
        self.refresh_tokens = [rt for rt in self.refresh_tokens if rt["token"] != token]

    # Conversation methods
    def create_conversation(self, user_id: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Create a new conversation"""
        conversation = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title or "New Conversation",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        self.conversations.append(conversation)
        return conversation.copy()

    def find_conversations_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Find all conversations for a user"""
        user_convos = [c.copy() for c in self.conversations if c["user_id"] == user_id]
        # Sort by updated_at descending
        user_convos.sort(key=lambda x: x["updated_at"], reverse=True)
        return user_convos

    def find_conversation_by_id(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Find conversation by ID"""
        for conv in self.conversations:
            if conv["id"] == conversation_id:
                return conv.copy()
        return None

    def update_conversation(self, conversation_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update conversation fields"""
        for conv in self.conversations:
            if conv["id"] == conversation_id:
                conv.update(kwargs)
                conv["updated_at"] = datetime.utcnow().isoformat()
                return conv.copy()
        return None

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete conversation and its messages"""
        # Delete messages
        self.messages = [m for m in self.messages if m["conversation_id"] != conversation_id]
        # Delete conversation
        initial_count = len(self.conversations)
        self.conversations = [c for c in self.conversations if c["id"] != conversation_id]
        return len(self.conversations) < initial_count

    def get_message_count(self, conversation_id: str) -> int:
        """Get count of messages in a conversation"""
        return sum(1 for m in self.messages if m["conversation_id"] == conversation_id)

    # Message methods
    def create_message(self, conversation_id: str, role: str, content: str) -> Dict[str, Any]:
        """Create a new message"""
        message = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "created_at": datetime.utcnow().isoformat()
        }
        self.messages.append(message)
        # Update conversation timestamp
        self.update_conversation(conversation_id)
        return message.copy()

    def find_messages_by_conversation(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Find all messages in a conversation"""
        conv_messages = [m.copy() for m in self.messages if m["conversation_id"] == conversation_id]
        # Sort by created_at ascending
        conv_messages.sort(key=lambda x: x["created_at"])
        return conv_messages


# Global mock database instance
mock_db = MockDatabase()
