# Add sources field to MessageResponse
with open('backend/app/models/chat.py', 'r') as f:
    content = f.read()

old_model = '''class MessageResponse(BaseModel):
    """Response model for message"""
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: str'''

new_model = '''class MessageResponse(BaseModel):
    """Response model for message"""
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: str
    sources: List[dict] = []'''

content = content.replace(old_model, new_model)

with open('backend/app/models/chat.py', 'w') as f:
    f.write(content)

print("Added sources field to MessageResponse")
