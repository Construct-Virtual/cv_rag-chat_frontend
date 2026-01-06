"""Admin router for user management"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.models.auth import UserResponse
from app.models.settings import (
    CreateUserRequest,
    UpdateUserRequest,
    UpdateUserStatusRequest,
    ResetPasswordRequest,
    UsersListResponse
)
from app.utils.auth import hash_password
from app.services import db
from app.utils.dependencies import get_current_user

router = APIRouter()


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency to require admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/users", response_model=UsersListResponse)
async def list_users(
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(require_admin)
):
    """
    List all users with pagination and search (admin only)

    - Requires admin role
    - Supports search by username, full_name, or email
    - Returns paginated user list
    """
    try:
        # Get users
        users = db.find_all_users(search=search, limit=limit, offset=offset)

        # Get total count
        total = db.count_users(search=search)

        # Format users (remove password_hash from response)
        formatted_users = [
            {
                "id": user["id"],
                "username": user["username"],
                "full_name": user.get("full_name"),
                "email": user.get("email"),
                "role": user["role"],
                "is_active": user.get("is_active", True),
                "created_at": user.get("created_at"),
                "last_login": user.get("last_login")
            }
            for user in users
        ]

        return UsersListResponse(
            users=formatted_users,
            total=total,
            limit=limit,
            offset=offset
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: CreateUserRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Create a new user (admin only)

    - Requires admin role
    - Creates user with hashed password
    - Returns created user data
    """
    try:
        # Check if username already exists
        existing_user = db.find_user_by_username(user_data.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")

        # Hash password
        password_hash = hash_password(user_data.password)

        # Create user
        new_user = db.create_user(
            username=user_data.username,
            password_hash=password_hash,
            role=user_data.role,
            full_name=user_data.full_name,
            email=user_data.email
        )

        return UserResponse(
            id=new_user["id"],
            username=new_user["username"],
            full_name=new_user.get("full_name"),
            email=new_user.get("email"),
            role=new_user["role"],
            last_login=new_user.get("last_login"),
            avatar_url=new_user.get("avatar_url")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User creation failed: {str(e)}")


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UpdateUserRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Update user details (admin only)

    - Requires admin role
    - Updates user profile and/or role
    - Returns updated user data
    """
    try:
        # Check if user exists
        existing_user = db.find_user_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update user
        updated_user = db.update_user(
            user_id=user_id,
            full_name=user_data.full_name,
            email=user_data.email,
            role=user_data.role
        )

        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserResponse(
            id=updated_user["id"],
            username=updated_user["username"],
            full_name=updated_user.get("full_name"),
            email=updated_user.get("email"),
            role=updated_user["role"],
            last_login=updated_user.get("last_login"),
            avatar_url=updated_user.get("avatar_url")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User update failed: {str(e)}")


@router.put("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    status_data: UpdateUserStatusRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Activate or deactivate user (admin only)

    - Requires admin role
    - Updates user active status
    - Returns updated user data
    """
    try:
        # Prevent admin from deactivating themselves
        if user_id == current_user["id"] and not status_data.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

        # Update status
        updated_user = db.update_user_status(user_id, status_data.is_active)

        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserResponse(
            id=updated_user["id"],
            username=updated_user["username"],
            full_name=updated_user.get("full_name"),
            email=updated_user.get("email"),
            role=updated_user["role"],
            last_login=updated_user.get("last_login"),
            avatar_url=updated_user.get("avatar_url")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status update failed: {str(e)}")


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    password_data: ResetPasswordRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Reset user password (admin only)

    - Requires admin role
    - Resets user password without requiring current password
    - Returns success message
    """
    try:
        # Check if user exists
        existing_user = db.find_user_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Hash new password
        new_password_hash = hash_password(password_data.new_password)

        # Update password
        success = db.update_user_password(user_id, new_password_hash)

        if not success:
            raise HTTPException(status_code=500, detail="Password reset failed")

        return {"message": "Password reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password reset failed: {str(e)}")


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Delete user (admin only)

    - Requires admin role
    - Deletes user and all related data (conversations, messages)
    - Returns success message
    """
    try:
        # Prevent admin from deleting themselves
        if user_id == current_user["id"]:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")

        # Check if user exists
        existing_user = db.find_user_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Delete user (CASCADE will delete conversations and messages)
        success = db.delete_user(user_id)

        if not success:
            raise HTTPException(status_code=404, detail="User not found")

        return {"message": "User deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User deletion failed: {str(e)}")
