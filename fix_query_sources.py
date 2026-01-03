# Fix query endpoint to save sources
with open('backend/app/routers/chat.py', 'r') as f:
    lines = f.readlines()

# Find the line with create_message in query endpoint (around line 340)
for i, line in enumerate(lines):
    if i >= 335 and i <= 345 and 'assistant_message = mock_db.create_message(' in line:
        # Found it - now update the next few lines
        # Current structure:
        #   assistant_message = mock_db.create_message(
        #       conversation_id=query_data.conversation_id,
        #       role="assistant",
        #       content=full_response
        #   )
        # Need to add: sources=citations
        
        # Check if the closing paren is on line i+4
        if i+3 < len(lines) and 'content=full_response' in lines[i+3]:
            # Replace the closing line
            lines[i+3] = '                    content=full_response,\n'
            lines.insert(i+4, '                    sources=citations\n')
            print(f"Updated line {i+3} to add sources parameter")
            break

with open('backend/app/routers/chat.py', 'w') as f:
    f.writelines(lines)

print("Fixed query endpoint to save sources")
