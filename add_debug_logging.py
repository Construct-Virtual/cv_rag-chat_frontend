# Add debug logging to regenerate endpoint
with open('backend/app/routers/chat.py', 'r') as f:
    content = f.read()

# Find the line after "try:"
old_code = '''    try:
        # Get the message to regenerate
        message = mock_db.find_message_by_id(message_id)'''

new_code = '''    try:
        # Get the message to regenerate
        print(f"DEBUG: Looking for message_id: {message_id}")
        print(f"DEBUG: Total messages in DB: {len(mock_db.messages)}")
        message = mock_db.find_message_by_id(message_id)
        print(f"DEBUG: Found message: {message is not None}")'''

content = content.replace(old_code, new_code)

with open('backend/app/routers/chat.py', 'w') as f:
    f.write(content)

print("Added debug logging")
