import requests
import json

try:
    r = requests.get('http://localhost:8000/api/chat/conversations')
    data = r.json()

    for conv in data:
        if conv.get('is_shared') and conv.get('share_token'):
            share_url = f"http://localhost:3000/shared/{conv['share_token']}"
            print(share_url)
            break
    else:
        print("No shared conversations found")
except Exception as e:
    print(f"Error: {e}")
