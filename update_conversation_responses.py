import re

# Read the file
with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find ConversationResponse returns and add sharing fields
# Match ConversationResponse with message_count but without is_shared
pattern = r'(return ConversationResponse\([^)]*message_count=message_count)\s*\)'

replacement = r'\1,\n            is_shared=conversation.get("is_shared", False),\n            share_token=conversation.get("share_token")\n        )'

content = re.sub(pattern, replacement, content)

# Also update the list comprehension in get_conversations
list_pattern = r'(result\.append\(ConversationResponse\([^)]*last_message_at=last_message_at)\s*\)\)'
list_replacement = r'\1,\n                is_shared=conv.get("is_shared", False),\n                share_token=conv.get("share_token")\n            ))'

content = re.sub(list_pattern, list_replacement, content)

# Write the file back
with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated all ConversationResponse returns with sharing fields")
