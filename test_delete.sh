#!/bin/bash

# Test conversation deletion

# Login
echo "=== Logging in ==="
LOGIN_RESP=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

TOKEN=$(echo $LOGIN_RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "Got token: ${TOKEN:0:30}..."

# Create conversation
echo ""
echo "=== Creating test conversation ==="
CONV_RESP=$(curl -s -X POST http://localhost:8000/api/chat/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Conversation to Delete"}')

CONV_ID=$(echo $CONV_RESP | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Created conversation: $CONV_ID"

# Add messages
echo ""
echo "=== Adding messages ==="
curl -s -X POST http://localhost:8000/api/chat/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"conversation_id\":\"$CONV_ID\",\"message\":\"Test message 1\"}" > /dev/null &
sleep 2

# Check messages
echo ""
echo "=== Checking messages before delete ==="
MESSAGES=$(curl -s -X GET "http://localhost:8000/api/chat/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TOKEN")
MSG_COUNT=$(echo $MESSAGES | grep -o '"id"' | wc -l)
echo "Message count: $MSG_COUNT"

# Delete conversation
echo ""
echo "=== Deleting conversation ==="
DELETE_RESP=$(curl -s -X DELETE "http://localhost:8000/api/chat/conversations/$CONV_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "Delete response: $DELETE_RESP"

# Try to get conversation (should return 404)
echo ""
echo "=== Trying to get deleted conversation ==="
GET_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "http://localhost:8000/api/chat/conversations/$CONV_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$GET_RESP"

echo ""
echo "=== Test complete ==="
