#!/usr/bin/env python3
import requests

# Step 1: Login
login_response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "admin", "password": "password123"}
)
access_token = login_response.json()["access_token"]

conversation_id = "ab2ed48f-7125-4659-9e0d-fce1aff02e37"
share_token = "0303957f-957a-4191-b0f1-c8a535bfc650"

print("Step 1: Check conversation is currently shared")
conv_response = requests.get(
    f"http://localhost:8000/api/chat/conversations/{conversation_id}",
    headers={"Authorization": f"Bearer {access_token}"}
)
conv_data = conv_response.json()
print(f"  is_shared: {conv_data['is_shared']}")
print(f"  share_token: {conv_data.get('share_token')}")

print("\nStep 2: Verify shared link works")
shared_response = requests.get(f"http://localhost:8000/api/chat/shared/{share_token}")
print(f"  Status: {shared_response.status_code}")

print("\nStep 3: Disable sharing")
disable_response = requests.delete(
    f"http://localhost:8000/api/chat/conversations/{conversation_id}/share",
    headers={"Authorization": f"Bearer {access_token}"}
)
print(f"  Status: {disable_response.status_code}")
print(f"  Response: {disable_response.json()}")

print("\nStep 4: Check conversation after disabling")
conv_response2 = requests.get(
    f"http://localhost:8000/api/chat/conversations/{conversation_id}",
    headers={"Authorization": f"Bearer {access_token}"}
)
conv_data2 = conv_response2.json()
print(f"  is_shared: {conv_data2['is_shared']}")
print(f"  share_token: {conv_data2.get('share_token')}")

print("\nStep 5: Verify shared link no longer works")
shared_response2 = requests.get(f"http://localhost:8000/api/chat/shared/{share_token}")
print(f"  Status: {shared_response2.status_code}")
if shared_response2.status_code == 404:
    print(f"  Message: {shared_response2.json()['detail']}")
    print("  ✅ SUCCESS: Shared link is now disabled!")
else:
    print(f"  ❌ FAIL: Shared link still works")
