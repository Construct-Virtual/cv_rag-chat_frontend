"""Settings and user management models"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class UpdateProfileRequest(BaseModel):
    """Update user profile request"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    """Change password request"""
    current_password: str
    new_password: str


class CreateUserRequest(BaseModel):
    """Create user request (admin only)"""
    username: str
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: str
    password: str


class UpdateUserRequest(BaseModel):
    """Update user request (admin only)"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None


class UpdateUserStatusRequest(BaseModel):
    """Update user status request (admin only)"""
    is_active: bool


class ResetPasswordRequest(BaseModel):
    """Reset user password request (admin only)"""
    new_password: str


class UsersListResponse(BaseModel):
    """Users list response with pagination"""
    users: list
    total: int
    limit: int
    offset: int
