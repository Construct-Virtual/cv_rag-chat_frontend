#!/usr/bin/env python3
import requests
import sys

# Step 1: Login
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

if not conversations:
    print("No conversations found")
    sys.exit(1)

# Get the first/latest conversation
conv = conversations[0]
print(f"Conversation ID: {conv['id']}")
print(f"Title: {conv.get('title', 'Untitled')}")

# Step 3: Share the conversation
share_response = requests.post(
    f"http://localhost:8000/api/chat/conversations/{conv['id']}/share",
    headers={"Authorization": f"Bearer {access_token}"}
)

if share_response.status_code != 200:
    print(f"Failed to share: {share_response.text}")
    sys.exit(1)

share_data = share_response.json()
share_token = share_data["share_token"]

print(f"\nShare Token: {share_token}")
print(f"Share URL: http://localhost:3000/shared/{share_token}")
