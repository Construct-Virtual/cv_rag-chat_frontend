# Backend Server Restart Instructions

## Why Restart is Needed

The backend server's auto-reload feature (uvicorn --reload) has failed to register new endpoints added in Sessions 18-19:
- `DELETE /api/chat/messages/{message_id}`
- `POST /api/chat/messages/{message_id}/regenerate`

These endpoints exist in the code but return 404 because uvicorn didn't properly reload the router module.

## How to Restart

### Option 1: Via Init Script (Recommended)
```bash
# Kill current backend (find PID first)
ps aux | grep uvicorn
# Note the PID, then:
# (Cannot use pkill -f uvicorn due to restrictions)

# Restart using init.sh
./init.sh
```

### Option 2: Manual Restart
```bash
cd backend
# Ensure you're in the backend directory
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Option 3: Kill and Restart Separately
```bash
# Find backend PID
ps aux | grep "uvicorn app.main:app"

# Kill the specific PID (NOT pkill - that kills all python)
kill <PID>

# Wait a moment
sleep 2

# Restart
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
cd ..
```

## Verification After Restart

1. **Check Server is Running**:
   ```bash
   curl http://localhost:8000/api/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Verify Endpoints Registered**:
   - Visit http://localhost:8000/docs
   - Look for "chat" section
   - Should see 13 total endpoints including:
     - `DELETE /api/chat/messages/{message_id}`
     - `POST /api/chat/messages/{message_id}/regenerate`

3. **Test Regenerate Endpoint**:
   ```bash
   curl -X POST "http://localhost:8000/api/chat/messages/test/regenerate" \
     -H "Authorization: Bearer test"
   ```
   Should return 401 Unauthorized (not 404)

## Expected Outcome

- ✅ All 13 endpoints visible in /docs
- ✅ Regenerate endpoint returns 401 (auth required) instead of 404
- ✅ Ready to test Feature #22 end-to-end

## Current Status

- **Endpoints in Code**: 13
- **Endpoints Registered**: 11
- **Missing**: 2 (delete message, regenerate message)
- **Cause**: Uvicorn reload didn't re-import router module

## What NOT to Do

❌ Do NOT use `pkill python` or `taskkill //F //IM python.exe`
   - This will kill the agent process itself!

❌ Do NOT reimplement Feature #22
   - Code is complete and correct
   - Only server restart is needed

## After Successful Restart

1. Test Feature #22 (Regenerate assistant response)
2. Update feature_list.json to mark as passing
3. Commit changes
4. Move to Feature #23 (Delete individual messages)

## Reference

- See SESSION_20_SUMMARY.md for full investigation details
- See learnings.md for uvicorn reload troubleshooting guide
