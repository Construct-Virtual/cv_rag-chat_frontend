#!/usr/bin/env python3
"""Debug regenerate issue - check message IDs"""

# Simulate what the backend does
import sys
sys.path.insert(0, 'backend')

from app.utils.mock_database import mock_db

# Check all messages
print("All messages in database:")
for msg in mock_db.messages[:10]:
    print(f"  ID: {msg['id']}, Role: {msg['role']}, Conv: {msg['conversation_id'][:8]}...")

print("\nTrying to find message from log: '754b3761-41b1-4f79-962a-2001d9ce017b'")
msg = mock_db.find_message_by_id('754b3761-41b1-4f79-962a-2001d9ce017b')
print(f"Result: {msg}")

print("\nTotal messages:", len(mock_db.messages))
