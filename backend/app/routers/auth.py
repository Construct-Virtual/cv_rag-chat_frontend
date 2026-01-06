"""Authentication router"""
from fastapi import APIRouter, HTTPException, Response, Depends, Request
from datetime import datetime
from app.models.auth import LoginRequest, TokenResponse, UserResponse
from app.models.settings import UpdateProfileRequest, ChangePasswordRequest
from app.utils.auth import verify_password, create_access_token, create_refresh_token, decode_token, hash_password
from app.services import db
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, response: Response):
    """
    Authenticate user and return JWT tokens

    - Validates credentials against database
    - Updates last_login timestamp
    - Returns access token and refresh token (set in httpOnly cookie)
    """
    try:
        # Query user by username
        user = db.find_user_by_username(login_data.username)

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Update last_login
        db.update_user_last_login(user["id"])
        user["last_login"] = datetime.utcnow().isoformat()

        # Create tokens
        access_token = create_access_token(user["id"], user["username"], user["role"])
        refresh_token, refresh_expires = create_refresh_token(user["id"])

        # Store refresh token in database
        db.create_refresh_token(user["id"], refresh_token, refresh_expires)

        # Set refresh token in httpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=7 * 24 * 60 * 60  # 7 days
        )

        # Prepare user response
        user_response = UserResponse(
            id=user["id"],
            username=user["username"],
            full_name=user.get("full_name"),
            email=user.get("email"),
            role=user["role"],
            last_login=user.get("last_login"),
            avatar_url=user.get("avatar_url")
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_response
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.post("/logout")
async def logout(response: Response):
    """
    Logout user and invalidate tokens

    - Clears refresh token cookie
    - Invalidates refresh token in database
    """
    try:
        # Clear the refresh token cookie
        response.delete_cookie(key="refresh_token")

        # TODO: Get refresh token from cookie and delete from database
        # For now, we'll just clear the cookie

        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")


@router.post("/test/clear-refresh-tokens")
async def clear_refresh_tokens():
    """Test endpoint to clear all refresh tokens"""
    db.refresh_tokens = []
    return {"message": "All refresh tokens cleared"}


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """
    Refresh access token using refresh token

    - Reads refresh token from httpOnly cookie
    - Validates refresh token
    - Issues new access token
    - Returns new access token
    """
    try:
        # Get refresh token from cookie
        refresh_token = request.cookies.get("refresh_token")

        if not refresh_token:
            raise HTTPException(status_code=401, detail="Refresh token not found")

        # Decode and verify refresh token
        payload = decode_token(refresh_token)

        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")

        # Get user ID from payload
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        # Verify refresh token exists in database
        if not db.verify_refresh_token(user_id, refresh_token):
            raise HTTPException(status_code=401, detail="Refresh token not found or revoked")

        # Get user from database
        user = db.find_user_by_id(user_id)

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Create new access token
        new_access_token = create_access_token(user["id"], user["username"], user["role"])

        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current user information

    - Requires valid access token
    - Returns user profile data
    """
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        full_name=current_user.get("full_name"),
        email=current_user.get("email"),
        role=current_user["role"],
        last_login=current_user.get("last_login"),
        avatar_url=current_user.get("avatar_url")
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user profile (name and email)

    - Requires valid access token
    - Updates full_name and/or email
    - Returns updated user data
    """
    try:
        updated_user = db.update_user_profile(
            user_id=current_user["id"],
            full_name=profile_data.full_name,
            email=profile_data.email
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
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")


@router.put("/password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Change user password

    - Requires valid access token
    - Validates current password
    - Updates to new password
    """
    try:
        # Get current user from database
        user = db.find_user_by_id(current_user["id"])

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify current password
        if not verify_password(password_data.current_password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        # Hash new password
        new_password_hash = hash_password(password_data.new_password)

        # Update password
        success = db.update_user_password(current_user["id"], new_password_hash)

        if not success:
            raise HTTPException(status_code=500, detail="Password update failed")

        return {"message": "Password updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password change failed: {str(e)}")
