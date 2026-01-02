import sys
sys.path.insert(0, 'backend')

from app.models.chat import ConversationResponse
import json

conv = ConversationResponse(
    id='test',
    user_id='user1',
    title='Test',
    created_at='2024-01-01',
    updated_at='2024-01-01',
    message_count=0,
    last_message_preview=None,
    last_message_at=None
)

print("Pydantic model_dump():")
print(json.dumps(conv.model_dump(), indent=2))

print("\nPydantic model_dump(exclude_none=False):")
print(json.dumps(conv.model_dump(exclude_none=False), indent=2))
