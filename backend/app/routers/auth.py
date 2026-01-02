"""Authentication router"""
from fastapi import APIRouter, HTTPException, Response, Depends
from datetime import datetime
from app.models.auth import LoginRequest, TokenResponse, UserResponse
from app.utils.auth import verify_password, create_access_token, create_refresh_token
from app.utils.mock_database import mock_db
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
        user = mock_db.find_user_by_username(login_data.username)

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Update last_login
        mock_db.update_user_last_login(user["id"])
        user["last_login"] = datetime.utcnow().isoformat()

        # Create tokens
        access_token = create_access_token(user["id"], user["username"], user["role"])
        refresh_token, refresh_expires = create_refresh_token(user["id"])

        # Store refresh token in database
        mock_db.create_refresh_token(user["id"], refresh_token, refresh_expires)

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
