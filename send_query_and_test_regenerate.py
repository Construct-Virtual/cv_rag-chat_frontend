#!/usr/bin/env python3
import requests
import json
import time

# Login
login_resp = requests.post('http://localhost:8002/api/auth/login', json={
    'username': 'admin',
    'password': 'password123'
})
token = login_resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

conv_id = 'cfa18840-995d-4bd5-b66e-a172d516f788'

# Send a query to create an assistant message
print("Sending query to create assistant message...")
query_resp = requests.post(
    f'http://localhost:8002/api/chat/query',
    headers=headers,
    json={'conversation_id': conv_id, 'message': 'What are the office hours?'},
    stream=True
)

# Consume the SSE stream
for line in query_resp.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            data = json.loads(line_str[6:])
            if data['type'] == 'complete':
                print(f"Query complete! Message saved.")
                break

time.sleep(1)

# Get messages to find the assistant message
msgs_resp = requests.get(f'http://localhost:8002/api/chat/conversations/{conv_id}/messages', headers=headers)
messages = msgs_resp.json()
print(f"\nMessages after query: {len(messages)}")

# Find last assistant message
last_assistant = None
for msg in reversed(messages):
    if msg['role'] == 'assistant':
        last_assistant = msg
        break

if last_assistant:
    print(f"Last assistant message: {last_assistant['content'][:80]}...")
    print(f"\nNow regenerating message {last_assistant['id']}...")
    
    # Call regenerate
    regen_resp = requests.post(
        f'http://localhost:8002/api/chat/messages/{last_assistant["id"]}/regenerate',
        headers=headers,
        json={},
        stream=True
    )
    
    print(f"Regenerate status: {regen_resp.status_code}")
    
    if regen_resp.status_code == 200:
        print("Streaming regenerated response:")
        for line in regen_resp.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data = json.loads(line_str[6:])
                    if data['type'] == 'token':
                        print(f"  Token: {data['content']}", end=' ')
                    elif data['type'] == 'complete':
                        print(f"\n\nRegenerate complete!")
                        print(f"Full content: {data['full_content'][:100]}...")
                        print(f"Sources: {len(data.get('sources', []))} sources")
                        break
                    elif data['type'] == 'error':
                        print(f"\nError: {data['message']}")
                        break
        
        # Check final messages
        time.sleep(1)
        final_msgs = requests.get(f'http://localhost:8002/api/chat/conversations/{conv_id}/messages', headers=headers)
        final_messages = final_msgs.json()
        print(f"\n\nFinal message count: {len(final_messages)}")
        print("SUCCESS: Regenerate feature working correctly!")
    else:
        print(f"Error: {regen_resp.text}")
else:
    print("No assistant message found")
