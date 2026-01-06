---
name: phased-development
description: Execute project work in isolated subagent phases to preserve main conversation context. Use when working on multi-phase development tasks from todo.md, when context is getting large, or when you want to delegate a phase of work to a fresh subagent that reads all project files.
---

# Phased Development Skill

Execute project work in isolated subagent phases to preserve main conversation context.

## When to Use

- Working on multi-phase projects from todo.md
- Main conversation context is getting large
- Want to delegate a phase to a fresh subagent
- Need persistent progress tracking across sessions

## Execution Steps

### Step 1: Read Current State

Read `.claude/phase-state.json` to understand:
- Which phases are completed
- Current phase in progress
- Key learnings from previous phases
- Overall project progress

### Step 2: Determine Target Phase

If no phase specified in user request:
- Continue current `in_progress` phase, OR
- Start next `pending` phase from todo.md

If phase specified:
- Validate it exists in todo.md
- Set it as target

### Step 3: Spawn Subagent

Use the Task tool with `subagent_type: "general-purpose"` and this prompt:

```
You are executing Phase [N]: [Phase Name] for a development project.

## CRITICAL: Read These Files First

Before doing ANY work, read these files to understand the project:

1. `CLAUDE.md` - Project instructions and conventions
2. `todo.md` - All tasks organized by phase
3. `feature_list.json` - Features to implement (ONLY change passes: false to true)
4. `.claude/learnings.md` - Solutions to known problems
5. `.claude/phase-state.json` - Current progress and context from previous phases

## Your Phase

Work on: **Phase [N]: [Phase Name]**

Tasks for this phase (from todo.md):
[List specific tasks for this phase]

## Work Rules

1. Mark tasks as `[x]` in todo.md when completed
2. Update feature_list.json ONLY to mark features as passing (never edit descriptions)
3. Add any new learnings to `.claude/learnings.md` using the template there
4. Use Playwright MCP for frontend testing, curl for backend testing
5. Credentials: admin / password123

## When Done

1. Update `.claude/phase-state.json`:
   - Set this phase status to "completed"
   - Add a 2-3 sentence summary of what was accomplished
   - Add any critical learnings to the learnings array
   - Increment completed_tasks count

2. Return a structured summary:

## Phase [N] Complete

**Tasks Completed:** X/Y
**Key Changes:**
- [bullet points of main changes]

**Files Modified:**
- [list of files]

**Learnings:**
- [any new learnings]

**Next Phase:** Phase [N+1]: [Name]
```

### Step 4: Report Results

After the subagent completes, report to user:
- Brief summary (3-5 lines)
- Tasks completed count
- Next phase recommendation
- Prompt user to invoke again for next phase

## Phase State Schema

The `.claude/phase-state.json` file tracks all progress:

```json
{
  "project": "cv_rag_chat",
  "last_updated": "2026-01-04T12:00:00Z",
  "overall_progress": {
    "total_phases": 18,
    "completed_phases": 9,
    "current_phase": "Phase 10: Header & Navigation"
  },
  "frontend_phases": {
    "Phase 10: Header & Navigation": {
      "status": "pending",
      "tasks_total": 5,
      "tasks_completed": 0,
      "tasks": ["F48: App branding/logo", "F49: Global search", "..."]
    }
  },
  "learnings": [
    "Key insight from previous phases..."
  ],
  "context_for_next_phase": "Summary of current state for next agent..."
}
```

## Benefits

1. **Context Preservation**: Main conversation stays lean
2. **Full Context Per Phase**: Each subagent has ~200k tokens available
3. **Persistent Progress**: State survives across sessions
4. **Knowledge Transfer**: Learnings accumulate and transfer forward
5. **User Control**: User decides when to proceed to next phase

## Notes

- Each phase should be completable in one subagent session
- If a phase is too large, consider splitting it in todo.md
- Always test features before marking as passing
- The subagent has access to all tools including Playwright MCP
