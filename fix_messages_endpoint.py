# Add sources to MessageResponse construction
with open('backend/app/routers/chat.py', 'r') as f:
    content = f.read()

old_construction = '''            MessageResponse(
                id=msg["id"],
                conversation_id=msg["conversation_id"],
                role=msg["role"],
                content=msg["content"],
                created_at=msg["created_at"]
            )'''

new_construction = '''            MessageResponse(
                id=msg["id"],
                conversation_id=msg["conversation_id"],
                role=msg["role"],
                content=msg["content"],
                created_at=msg["created_at"],
                sources=msg.get("sources", [])
            )'''

content = content.replace(old_construction, new_construction)

with open('backend/app/routers/chat.py', 'w') as f:
    f.write(content)

print("Added sources to MessageResponse construction")
