#!/usr/bin/env python3
import requests
import sys

# Step 1: Login to get auth token
login_response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "admin", "password": "password123"}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    sys.exit(1)

auth_data = login_response.json()
access_token = auth_data["access_token"]

# Step 2: Get conversations
conversations_response = requests.get(
    "http://localhost:8000/api/chat/conversations",
    headers={"Authorization": f"Bearer {access_token}"}
)

if conversations_response.status_code != 200:
    print(f"Failed to get conversations: {conversations_response.text}")
    sys.exit(1)

conversations = conversations_response.json()

# Step 3: Find shared conversation
for conv in conversations:
    if conv.get("is_shared") and conv.get("share_token"):
        print(f"Share Token: {conv['share_token']}")
        print(f"Share URL: http://localhost:3000/shared/{conv['share_token']}")
        sys.exit(0)

print("No shared conversations found")
