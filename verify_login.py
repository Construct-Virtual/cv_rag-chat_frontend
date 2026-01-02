#!/usr/bin/env python3
import requests
import json

# Test login with valid credentials
print("Testing login with valid credentials (admin user)...")
response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "admin", "password": "password123"}
)

if response.status_code == 200:
    data = response.json()
    if "access_token" in data and "user" in data:
        print("[OK] Login successful!")
        print(f"   User: {data['user']['username']}")
        print(f"   Role: {data['user']['role']}")
        print(f"   Token received: {data['access_token'][:20]}...")
    else:
        print("[FAIL] Login response missing expected fields")
        print(f"   Response: {json.dumps(data, indent=2)}")
else:
    print(f"[FAIL] Login failed with status {response.status_code}")
    print(f"   Response: {response.text}")

# Test invalid credentials
print("\nTesting login with invalid credentials...")
response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "admin", "password": "wrongpassword"}
)

if response.status_code == 401:
    print("[OK] Invalid credentials correctly rejected")
else:
    print(f"[FAIL] Expected 401, got {response.status_code}")
    print(f"   Response: {response.text}")
