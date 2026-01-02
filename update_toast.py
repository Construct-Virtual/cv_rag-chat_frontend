#!/usr/bin/env python3

with open('frontend/app/chat/page.tsx', 'r') as f:
    content = f.read()

# Replace alert with toast for success
old_success = 'alert("Conversation renamed successfully!");'
new_success = '''setToast({ message: "Conversation renamed successfully!", type: "success" });
      setTimeout(() => setToast(null), 3000);'''

content = content.replace(old_success, new_success)

# Replace alert with toast for error
old_error = 'alert("Failed to rename conversation. Please try again.");'
new_error = '''setToast({ message: "Failed to rename conversation. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 3000);'''

content = content.replace(old_error, new_error)

with open('frontend/app/chat/page.tsx', 'w') as f:
    f.write(content)

print('Updated alerts to use toast notifications')
