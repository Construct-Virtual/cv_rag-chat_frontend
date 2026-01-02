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


# Global mock database instance
mock_db = MockDatabase()
