"""Authentication models"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    """Login request payload"""
    username: str
    password: str


class UserResponse(BaseModel):
    """User information response"""
    id: str
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: str
    last_login: Optional[datetime] = None
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    """Authentication token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


class AccessTokenResponse(BaseModel):
    """New access token response"""
    access_token: str
    token_type: str = "bearer"
