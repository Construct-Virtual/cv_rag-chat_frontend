#!/usr/bin/env python3
"""Test shared conversation viewing"""
import requests

# Login first
login_response = requests.post(
    'http://localhost:8000/api/auth/login',
    json={'username': 'admin', 'password': 'password123'}
)
login_data = login_response.json()
access_token = login_data['access_token']

headers = {'Authorization': f'Bearer {access_token}'}

# Get conversations
conv_response = requests.get('http://localhost:8000/api/chat/conversations', headers=headers)
conversations = conv_response.json()

# Find a shared conversation
shared_conv = None
for conv in conversations:
    if conv.get('is_shared') and conv.get('share_token'):
        shared_conv = conv
        break

if shared_conv:
    share_token = shared_conv['share_token']
    share_url = f"http://localhost:3000/shared/{share_token}"
    print(f"Share Token: {share_token}")
    print(f"Share URL: {share_url}")

    # Test the public endpoint
    shared_response = requests.get(f'http://localhost:8000/api/chat/shared/{share_token}')
    if shared_response.status_code == 200:
        print("\n✓ Shared conversation endpoint works!")
        print(f"Title: {shared_response.json()['title']}")
    else:
        print(f"\n✗ Failed to get shared conversation: {shared_response.status_code}")
else:
    print("No shared conversations found")
    print("Creating and sharing a conversation...")

    # Create a conversation
    create_response = requests.post(
        'http://localhost:8000/api/chat/conversations',
        headers=headers,
        json={'title': 'Test Shared Conversation'}
    )
    new_conv = create_response.json()
    conv_id = new_conv['id']

    # Share it
    share_response = requests.post(
        f'http://localhost:8000/api/chat/conversations/{conv_id}/share',
        headers=headers
    )
    shared_data = share_response.json()
    share_token = shared_data['share_token']
    share_url = f"http://localhost:3000/shared/{share_token}"

    print(f"\nCreated and shared conversation!")
    print(f"Share Token: {share_token}")
    print(f"Share URL: {share_url}")
