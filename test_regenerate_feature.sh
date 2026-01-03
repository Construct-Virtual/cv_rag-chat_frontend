#!/bin/bash
# Test regenerate feature end-to-end

# Step 1: Login to get token
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "Got access token: ${ACCESS_TOKEN:0:20}..."

# Step 2: Create a new conversation
echo -e "\nStep 2: Creating conversation..."
CONV_RESPONSE=$(curl -s -X POST http://localhost:8000/api/chat/conversations \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Regenerate"}')

CONV_ID=$(echo "$CONV_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created conversation: $CONV_ID"

# Step 3: Send a query to get an assistant message
echo -e "\nStep 3: Sending query..."
curl -s -X POST http://localhost:8000/api/chat/query \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"conversation_id\":\"$CONV_ID\",\"message\":\"What is the employee onboarding process?\"}" \
  > /dev/null

sleep 3

# Step 4: Get messages to find the assistant message ID
echo -e "\nStep 4: Getting messages..."
MESSAGES_RESPONSE=$(curl -s http://localhost:8000/api/chat/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$MESSAGES_RESPONSE" | head -c 500
echo -e "\n..."

# Extract last message ID (should be assistant message)
ASSISTANT_MSG_ID=$(echo "$MESSAGES_RESPONSE" | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)
echo -e "\nAssistant message ID: $ASSISTANT_MSG_ID"

# Step 5: Test regenerate endpoint
echo -e "\nStep 5: Testing regenerate..."
REGEN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "http://localhost:8000/api/chat/messages/$ASSISTANT_MSG_ID/regenerate" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_STATUS=$(echo "$REGEN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Regenerate endpoint works!"
  echo "Response preview:"
  echo "$REGEN_RESPONSE" | grep -v "HTTP_STATUS" | head -c 300
else
  echo "✗ Regenerate failed"
  echo "$REGEN_RESPONSE"
fi

