import requests
import json
import time

# Login to get access token
print("Logging in...")
login_response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "admin", "password": "password123"}
)
login_data = login_response.json()
access_token = login_data["access_token"]
print(f"Logged in as {login_data['user']['username']} (role: {login_data['user']['role']})")

# Create a conversation
print("\nCreating conversation...")
conv_response = requests.post(
    "http://localhost:8000/api/chat/conversations",
    headers={"Authorization": f"Bearer {access_token}"},
    json={"title": "RAG Test"}
)
conv_data = conv_response.json()
conv_id = conv_data["id"]
print(f"Created conversation: {conv_id}")

# Send a query and collect the streaming response
print("\nSending query about security protocols...")
query_response = requests.post(
    "http://localhost:8000/api/chat/query",
    headers={"Authorization": f"Bearer {access_token}"},
    json={"conversation_id": conv_id, "message": "What are the security protocols?"},
    stream=True
)

sources = None
full_content = ""

for line in query_response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            data = json.loads(line[6:])
            if data['type'] == 'token':
                full_content = data.get('full_content', '')
            elif data['type'] == 'complete':
                sources = data.get('sources', [])
                print(f"\n[COMPLETE] Full response ({len(full_content)} chars)")
                print(f"Response preview: {full_content[:200]}...")
                break

# Display sources
if sources:
    print(f"\n[SOURCES] Found {len(sources)} sources:")
    for i, source in enumerate(sources, 1):
        print(f"\n  Source {i}:")
        print(f"    Display Name: {source['display_name']}")
        print(f"    Category: {source['category']}")
        print(f"    File: {source['file_name']}")
        print(f"    Page: {source.get('page_number', 'N/A')}")
        print(f"    Score: {source['similarity_score']:.2%}")
        print(f"    Excerpt: {source['excerpt'][:100]}...")
else:
    print("\n[ERROR] No sources returned!")

print("\n[SUCCESS] RAG pipeline test complete!")
