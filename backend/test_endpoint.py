"""Test login endpoint directly"""
import sys
import traceback
from fastapi.testclient import TestClient

try:
    from app.main import app

    client = TestClient(app)

    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "password123"}
    )

    print(f"Status Code: {response.status_code}")
    print(f"Headers: {response.headers}")
    print(f"Content: {response.text}")

    if response.status_code == 200:
        print(f"JSON: {response.json()}")

except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
