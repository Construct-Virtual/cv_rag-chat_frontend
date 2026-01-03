# Agent Learnings

Solutions to problems encountered during development.
**Check this file FIRST when you encounter errors.**

## Quick Reference
- [In-Memory Database](#backend-in-memory-database-restart-data-loss) - Data loss on server restart
- [Function Signature Mismatch](#backend-function-signature-mismatch) - TypeError from missing parameters
- [Response Model Missing Fields](#api-response-model-missing-fields) - Data not returned in API

---

## Error Solutions

### [Backend] In-Memory Database Restart Data Loss
**Error:** `404 Not Found` or `Message not found` errors after server restart
**Context:** FastAPI with uvicorn --reload, in-memory mock database
**Solution:**
1. Remember that in-memory databases (like MockDatabase) lose ALL data when server restarts
2. After backend restart, old message/conversation IDs from frontend become invalid
3. To test features requiring existing data, create NEW data after server starts
4. Don't rely on old IDs from before restart
**Verified:** Session 19, commit 3316b88
**Tags:** uvicorn, reload, in-memory, database, 404

### [Backend] Function Signature Mismatch
**Error:** `TypeError` when calling function with parameter it doesn't accept
**Context:** Python function called with keyword argument not in signature
**Solution:**
1. Check function signature matches all call sites
2. Add optional parameters with default values: `param: Type = None`
3. Use grep to find all call sites: `grep -r "function_name(" .`
4. Update function signature before updating callers
**Verified:** Session 19, commit 3316b88
**Tags:** python, function, parameters, TypeError

### [API] Response Model Missing Fields
**Error:** Data exists in database but not returned in API response
**Context:** Pydantic BaseModel used as response_model in FastAPI
**Solution:**
1. Check that Pydantic model includes all fields you want to return
2. Verify field names match between database and model
3. Add optional fields with defaults: `field: Type = []`
4. Update endpoint to include new fields when constructing response
**Verified:** Session 19, commit 3316b88
**Tags:** fastapi, pydantic, response-model, api

<!--
TEMPLATE FOR NEW ENTRIES:

### [Category] Problem Title
**Error:** `exact error message or pattern`
**Context:** technology stack, situation
**Solution:**
1. Step one
2. Step two
**Verified:** Session N, commit hash
**Tags:** keyword1, keyword2
-->

### [Server] Uvicorn Auto-Reload Not Registering New Endpoints
**Error:** `404 Not Found` for endpoints that exist in code but not in runtime
**Context:** FastAPI with uvicorn --reload, new @router decorators added to existing router file
**Solution:**
1. Check if endpoint exists in code: `grep "@router" backend/app/routers/chat.py`
2. Check if endpoint registered: Visit http://localhost:8000/docs
3. If endpoint in code but not in docs, uvicorn reload failed
4. MUST fully restart backend server (not just reload)
5. Stop server completely and restart via init.sh
6. Verify endpoints appear in /docs after restart
**Root Cause:** Uvicorn's --reload feature sometimes fails to re-import modules properly, especially when new route decorators are added. File changes are detected but the Python process doesn't fully reload the module.
**Verified:** Session 19, Session 20
**Tags:** uvicorn, fastapi, reload, 404, endpoints, router

