
# Fix Plan: Collaborative Mode for Recurring Tasks

## Problem Identified

When recurring task instances are generated from templates, the **`is_collaborative` setting is not being inherited**. The Edge Function that generates recurring tasks copies most template fields but misses `is_collaborative`.

## Root Cause

In `supabase/functions/generate-recurring-tasks/index.ts` (lines 314-331), the task instance insert is missing:
```typescript
is_collaborative: template.is_collaborative
```

## Solution

### 1. Fix the Edge Function (Critical)
Add `is_collaborative` to the fields copied from template to instance:

**File:** `supabase/functions/generate-recurring-tasks/index.ts`

```typescript
// Line ~316-332 - Add is_collaborative to insert
.insert({
  title: template.title,
  description: template.description,
  priority: template.priority,
  status: 'Pending',
  due_at: template.next_run_at,
  entity: template.entity,
  project_id: template.project_id,
  labels: template.labels,
  created_by: template.created_by,
  template_task_id: template.id,
  occurrence_date: occurrenceDateStr,
  task_type: 'recurring',
  jira_link: template.jira_link,
  is_collaborative: template.is_collaborative ?? false, // ← ADD THIS
})
```

### 2. Backfill Existing Instances (Optional)
For recurring tasks already generated without `is_collaborative`, provide a one-time update script (run in Cloud View):

```sql
-- Backfill is_collaborative from templates to existing instances
UPDATE tasks AS instance
SET is_collaborative = template.is_collaborative
FROM tasks AS template
WHERE instance.template_task_id = template.id
  AND template.is_collaborative = true
  AND instance.is_collaborative = false;
```

### 3. Audit Other Missing Template Fields
While reviewing the Edge Function, these additional fields should also be considered for inheritance (future improvement):

| Field | Currently Copied? | Should Copy? |
|-------|-------------------|--------------|
| `is_collaborative` | ❌ No | ✅ Yes |
| `estimated_hours` | ❌ No | ✅ Yes (if set) |
| `teams` | ❌ No | ✅ Yes (if set) |
| `is_external_dependency` | ❌ No | Maybe |

## Technical Details

### Files to Modify
1. `supabase/functions/generate-recurring-tasks/index.ts` - Add `is_collaborative` to insert

### Why This Happened
The Edge Function was written before collaborative mode was added. When `is_collaborative` was introduced, the recurring task generator wasn't updated to include it.

### Testing
1. Create a recurring task template with multiple assignees
2. Enable collaborative mode on the template
3. Wait for/trigger the cron job to generate an instance
4. Verify the instance has `is_collaborative: true`
5. Confirm each assignee must mark complete before task completes

## Expected Outcome
- New recurring task instances will inherit collaborative mode setting
- Existing instances can be backfilled via SQL
- Task completion rules apply consistently across regular and recurring tasks
