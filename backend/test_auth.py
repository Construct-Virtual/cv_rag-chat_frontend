"""Test auth endpoint"""
import sys
import traceback

try:
    from app.utils.auth import verify_password
    from app.utils.mock_database import mock_db

    print("Imports successful!")

    # Test finding a user
    user = mock_db.find_user_by_username("admin")
    print(f"Found user: {user['username']}")

    # Test password verification
    result = verify_password("password123", user["password_hash"])
    print(f"Password verification: {result}")

except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
