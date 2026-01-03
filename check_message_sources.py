import requests

# Login first
login_response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "admin", "password": "password123"}
)
access_token = login_response.json()["access_token"]

# Get messages from the authenticated endpoint
messages_response = requests.get(
    "http://localhost:8000/api/chat/conversations/ab2ed48f-7125-4659-9e0d-fce1aff02e37/messages",
    headers={"Authorization": f"Bearer {access_token}"}
)

import json
messages = messages_response.json()
print(json.dumps(messages, indent=2))
