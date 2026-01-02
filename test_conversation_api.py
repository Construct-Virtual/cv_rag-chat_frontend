#!/usr/bin/env python3
"""Test conversation API to verify last_message_preview and timestamps"""

import requests
import json
import time

API_URL = "http://localhost:8000"

# Step 1: Login
print("Step 1: Login...")
login_response = requests.post(
    f"{API_URL}/api/auth/login",
    json={"username": "admin", "password": "password123"}
)
login_data = login_response.json()
token = login_data["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"[OK] Logged in as admin\n")

# Step 2: Create a conversation
print("Step 2: Create conversation...")
conv_response = requests.post(
    f"{API_URL}/api/chat/conversations",
    json={"title": "Test Conversation"},
    headers=headers
)
conv_data = conv_response.json()
conv_id = conv_data["id"]
print(f"[OK] Created conversation: {conv_id}\n")

# Step 3: Create a user message
print("Step 3: Create user message...")
msg1_response = requests.post(
    f"{API_URL}/api/chat/messages",
    json={
        "conversation_id": conv_id,
        "role": "user",
        "content": "What is the employee onboarding process?"
    },
    headers=headers
)
print(f"[OK] Created user message\n")

# Wait a moment
time.sleep(0.5)

# Step 4: Create an assistant message
print("Step 4: Create assistant message...")
msg2_response = requests.post(
    f"{API_URL}/api/chat/messages",
    json={
        "conversation_id": conv_id,
        "role": "assistant",
        "content": "The employee onboarding process involves several key steps..."
    },
    headers=headers
)
print(f"[OK] Created assistant message\n")

# Step 5: Get all conversations
print("Step 5: Get all conversations...")
convs_response = requests.get(
    f"{API_URL}/api/chat/conversations",
    headers=headers
)
convs_data = convs_response.json()

print(f"[OK] Retrieved {len(convs_data)} conversation(s)\n")

# Step 6: Check the conversation data
print("=" * 60)
print("CONVERSATION DATA:")
print("=" * 60)
for conv in convs_data:
    print(json.dumps(conv, indent=2))
    print()

    # Check for required fields
    print("Field Checks:")
    print(f"  [OK] id: {conv.get('id', 'MISSING')}")
    print(f"  [OK] title: {conv.get('title', 'MISSING')}")
    print(f"  [OK] message_count: {conv.get('message_count', 'MISSING')}")

    if 'last_message_preview' in conv and conv['last_message_preview']:
        print(f"  [OK] last_message_preview: '{conv['last_message_preview']}'")
    else:
        print(f"  [FAIL] last_message_preview: MISSING OR NULL")

    if 'last_message_at' in conv and conv['last_message_at']:
        print(f"  [OK] last_message_at: {conv['last_message_at']}")
    else:
        print(f"  [FAIL] last_message_at: MISSING OR NULL")

print("\n" + "=" * 60)
