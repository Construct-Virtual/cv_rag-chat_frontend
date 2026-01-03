#!/usr/bin/env python3
import requests
import json

# Login
login_resp = requests.post('http://localhost:8002/api/auth/login', json={
    'username': 'admin',
    'password': 'password123'
})
token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Get conversation messages
conv_id = 'cfa18840-995d-4bd5-b66e-a172d516f788'
msgs_resp = requests.get(f'http://localhost:8002/api/chat/conversations/{conv_id}/messages', headers=headers)
messages = msgs_resp.json()

print(f"Messages before regenerate: {len(messages)}")
for msg in messages:
    print(f"  - {msg['role']}: {msg['content'][:50]}...")

if len(messages) > 0:
    # Find last assistant message
    last_assistant = None
    for msg in reversed(messages):
        if msg['role'] == 'assistant':
            last_assistant = msg
            break
    
    if last_assistant:
        print(f"\nRegenerating message {last_assistant['id']}")
        regen_resp = requests.post(
            f'http://localhost:8002/api/chat/messages/{last_assistant["id"]}/regenerate',
            headers=headers
        )
        print(f"Regenerate response status: {regen_resp.status_code}")
        
        # Get messages after regenerate
        msgs_after = requests.get(f'http://localhost:8002/api/chat/conversations/{conv_id}/messages', headers=headers)
        messages_after = msgs_after.json()
        print(f"\nMessages after regenerate: {len(messages_after)}")
        for msg in messages_after:
            print(f"  - {msg['role']}: {msg['content'][:50]}...")
    else:
        print("No assistant message found to regenerate")
else:
    print("No messages in conversation")
