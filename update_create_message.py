# Update create_message to accept sources parameter
with open('backend/app/utils/mock_database.py', 'r') as f:
    content = f.read()

# Replace the create_message function
old_func = '''    def create_message(self, conversation_id: str, role: str, content: str) -> Dict[str, Any]:
        """Create a new message"""
        message = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "created_at": datetime.utcnow().isoformat()
        }
        self.messages.append(message)
        # Update conversation timestamp
        self.update_conversation(conversation_id)
        return message.copy()'''

new_func = '''    def create_message(self, conversation_id: str, role: str, content: str, sources: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a new message"""
        message = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "sources": sources if sources is not None else [],
            "created_at": datetime.utcnow().isoformat()
        }
        self.messages.append(message)
        # Update conversation timestamp
        self.update_conversation(conversation_id)
        return message.copy()'''

content = content.replace(old_func, new_func)

with open('backend/app/utils/mock_database.py', 'w') as f:
    f.write(content)

print("Updated create_message function to accept sources parameter")
