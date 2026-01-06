# n8n Workflow Metadata Update - TODO

## Overview
Update the n8n ingestion workflow to include `allowed_roles` and `is_public` metadata fields required for role-based access control in the SOP RAG chat system.

## Why This Is Needed
Without these metadata fields, the `search_documents_by_role()` PostgreSQL function cannot filter documents by user role, making all documents inaccessible to non-admin users.

## Changes Required

### Change #1: Update "Fields" Node

**Node Name**: `Fields`
**Node ID**: `2ad681da-9d09-486a-b8c1-2403035fe434`
**Location**: Between "Extract from File" → "Supabase Vector Store"
**Current Position**: Lines 239-265 in `ingestion_workflow.json`

**Current Configuration**:
```json
{
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "472aeae8-243c-4742-9306-972aa7e721ba",
          "name": "content",
          "value": "={{ $json.text }}",
          "type": "string"
        },
        {
          "id": "b565b3ee-a743-44d2-8620-3892bdfb0db8",
          "name": "file_id",
          "value": "={{ $('Loop Over Price Items').item.json.uniqueId }}",
          "type": "string"
        }
      ]
    },
    "options": {}
  }
}
```

**Updated Configuration** (add 3 new assignments):
```json
{
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "472aeae8-243c-4742-9306-972aa7e721ba",
          "name": "content",
          "value": "={{ $json.text }}",
          "type": "string"
        },
        {
          "id": "b565b3ee-a743-44d2-8620-3892bdfb0db8",
          "name": "file_id",
          "value": "={{ $('Loop Over Price Items').item.json.uniqueId }}",
          "type": "string"
        },
        {
          "id": "NEW_ID_1_REPLACE_ME",
          "name": "file_name",
          "value": "={{ $('Loop Over Price Items').item.json.fileName }}",
          "type": "string"
        },
        {
          "id": "NEW_ID_2_REPLACE_ME",
          "name": "allowed_roles",
          "value": "[\"admin\"]",
          "type": "string"
        },
        {
          "id": "NEW_ID_3_REPLACE_ME",
          "name": "is_public",
          "value": "true",
          "type": "string"
        }
      ]
    },
    "options": {}
  }
}
```

**How It Should Look in n8n UI**:
- Field 1: `content` = `{{ $json.text }}`
- Field 2: `file_id` = `{{ $('Loop Over Price Items').item.json.uniqueId }}`
- Field 3: `file_name` = `{{ $('Loop Over Price Items').item.json.fileName }}`
- Field 4: `allowed_roles` = `["admin"]`
- Field 5: `is_public` = `true`

---

### Change #2: Update "Default Data Loader" Node

**Node Name**: `Default Data Loader`
**Node ID**: `cf31d670-be76-475e-85eb-04138970a05a`
**Location**: Connected to "Supabase Vector Store"
**Current Position**: Lines 34-58 in `ingestion_workflow.json`

**Current Configuration**:
```json
{
  "parameters": {
    "textSplittingMode": "custom",
    "options": {
      "metadata": {
        "metadataValues": [
          {
            "name": "file_id",
            "value": "={{ $('Loop Over Price Items').item.json.uniqueId }}"
          },
          {
            "name": "file_name",
            "value": "={{ $('Loop Over Price Items').item.json.fileName }}"
          }
        ]
      }
    }
  }
}
```

**Updated Configuration** (add 2 new metadata values):
```json
{
  "parameters": {
    "textSplittingMode": "custom",
    "options": {
      "metadata": {
        "metadataValues": [
          {
            "name": "file_id",
            "value": "={{ $('Loop Over Price Items').item.json.uniqueId }}"
          },
          {
            "name": "file_name",
            "value": "={{ $('Loop Over Price Items').item.json.fileName }}"
          },
          {
            "name": "allowed_roles",
            "value": "[\"admin\"]"
          },
          {
            "name": "is_public",
            "value": "true"
          }
        ]
      }
    }
  }
}
```

**How It Should Look in n8n UI** (Metadata section):
- Metadata 1: `file_id` = `{{ $('Loop Over Price Items').item.json.uniqueId }}`
- Metadata 2: `file_name` = `{{ $('Loop Over Price Items').item.json.fileName }}`
- Metadata 3: `allowed_roles` = `["admin"]`
- Metadata 4: `is_public` = `true`

---

## Advanced: Role-Based Access Control (Optional)

If you want different documents to have different role permissions based on folder path or filename, you can use conditional logic:

### Dynamic `allowed_roles` Based on Folder

**In "Fields" Node**:
```json
{
  "id": "NEW_ID_2_REPLACE_ME",
  "name": "allowed_roles",
  "value": "={{ $('Loop Over Price Items').item.json.webUrl.includes('HR') ? '[\"admin\",\"hr\"]' : $('Loop Over Price Items').item.json.webUrl.includes('Finance') ? '[\"admin\",\"finance\"]' : '[\"admin\"]' }}",
  "type": "string"
}
```

**Logic**:
- If file URL contains "HR" → `["admin", "hr"]`
- If file URL contains "Finance" → `["admin", "finance"]`
- Otherwise → `["admin"]` (admin only)

### Dynamic `is_public` Based on Folder

```json
{
  "id": "NEW_ID_3_REPLACE_ME",
  "name": "is_public",
  "value": "={{ $('Loop Over Price Items').item.json.webUrl.includes('Public') ? 'true' : 'false' }}",
  "type": "string"
}
```

**Logic**:
- If file URL contains "Public" → `true`
- Otherwise → `false`

---

## Expected Database Result

After running the updated workflow, documents in the `documents` table should have metadata like this:

```json
{
  "file_id": "01FWL5VJMXI7XZSD5PB5BKT7UU6CHFT5LV",
  "file_name": "Employee_Handbook.pdf",
  "allowed_roles": ["admin"],
  "is_public": true
}
```

Or with role-based access:

```json
{
  "file_id": "01FWL5VJMXI7XZSD5PB5BKT7UU6CHFT5LV",
  "file_name": "HR_Policy.pdf",
  "allowed_roles": ["admin", "hr"],
  "is_public": false
}
```

---

## How to Apply Changes

### Method 1: UI (Recommended)
1. Open n8n workflow editor
2. Click on **"Fields"** node
3. Click **"Add Assignment"** button 3 times
4. Fill in the new fields as shown above
5. Click on **"Default Data Loader"** node
6. Scroll to **"Options"** → **"Metadata"**
7. Click **"Add Metadata"** button 2 times
8. Fill in the new metadata fields as shown above
9. **Save** and **Activate** workflow

### Method 2: JSON (Advanced)
1. Export current workflow as JSON
2. Manually edit the JSON with changes above
3. Import updated workflow back into n8n
4. **Activate** workflow

---

## Verification

After updating and running the workflow, verify metadata in Supabase:

```sql
-- Check document metadata
SELECT
  id,
  content,
  metadata->>'file_name' as file_name,
  metadata->>'allowed_roles' as allowed_roles,
  metadata->>'is_public' as is_public
FROM documents
LIMIT 5;
```

**Expected output**:
| id | content | file_name | allowed_roles | is_public |
|----|---------|-----------|---------------|-----------|
| 1 | "Company policy states..." | "Policy.pdf" | ["admin"] | true |

---

## Roles in SOP System

Current roles defined in `sop_users` table:
- `admin` - Full access to all documents
- `hr` - Human Resources documents
- `finance` - Finance documents
- `manager` - Management documents
- `employee` - General employee documents

**Match these roles in `allowed_roles` array!**

---

## Troubleshooting

### Documents Not Showing Up for Non-Admin Users
**Cause**: Missing `allowed_roles` or `is_public` metadata
**Fix**: Re-run workflow with updated metadata, or manually update existing documents:

```sql
-- Make all documents public (temporary fix)
UPDATE documents
SET metadata = metadata || '{"is_public": true}'::jsonb
WHERE metadata->>'is_public' IS NULL;

-- Add admin role to all documents (temporary fix)
UPDATE documents
SET metadata = metadata || '{"allowed_roles": ["admin"]}'::jsonb
WHERE metadata->>'allowed_roles' IS NULL;
```

### Metadata Not Saved as JSON Array
**Cause**: String quotes around array
**Fix**: Use `["admin"]` NOT `"[\"admin\"]"` in n8n fields

---

## Related Files

- **Workflow**: `n8n/ingestion_workflow.json`
- **Vector Search Function**: `database/migrations/004_vector_search_function.sql`
- **RAG Service**: `backend/app/services/rag_service.py` (line 198)
- **Summary Document**: `SOP_TABLE_MIGRATION_SUMMARY.md`

---

## Status

- [ ] Update "Fields" node with 3 new assignments
- [ ] Update "Default Data Loader" node with 2 new metadata values
- [ ] Test workflow with a sample document
- [ ] Verify metadata in Supabase documents table
- [ ] Test role-based filtering with different user roles
- [ ] (Optional) Implement dynamic role assignment based on folder

---

**Priority**: High
**Estimated Time**: 15 minutes
**Impact**: Without this change, role-based document filtering will not work, and non-admin users won't see any documents.
