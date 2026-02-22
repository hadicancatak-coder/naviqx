
# Fix Recurring Task Duplicates + Bulk Task Creation

## Problem Summary
Two issues to fix:
1. **Recurring tasks are duplicating** -- There are 26 duplicate occurrence pairs in the database. Tasks like "Meta Audience Updates", "Daily Checklist", "Seminars Report" all have 2 copies for the same date. This happens because the DB trigger and the edge function both try to create instances without a database-level uniqueness guarantee.
2. **Bulk task creation** is already wired in but needs to be verified working.

## Root Cause: Recurring Duplicates
The system has 3 layers generating recurring task instances:
- Layer 1: DB trigger (`generate_next_recurring_instance`) fires on task completion
- Layer 2: Edge function (`generate-recurring-tasks`) does batch catch-up
- Layer 3: Client-side check in `useTasks` invokes the edge function on load

Both the trigger and edge function check for existing instances before inserting, but **without a unique constraint**, they can race and both insert.

## Plan

### Step 1: Add unique constraint to prevent future duplicates
Add a database migration with a unique index on `(template_task_id, occurrence_date)` so duplicates are impossible at the DB level.

### Step 2: Clean up existing duplicate data
Delete one copy from each duplicate pair, keeping the oldest entry.

### Step 3: Update the DB trigger to handle conflicts
Modify `generate_next_recurring_instance` to use `ON CONFLICT DO NOTHING` (or catch the unique violation) so it silently skips if the edge function already created the instance.

### Step 4: Update the edge function to handle conflicts
Update the edge function insert to use upsert or conflict handling so it doesn't error when the trigger already created the instance.

## Technical Details

### Database Migration SQL
```text
-- 1. Delete duplicates (keep the oldest per template+date pair)
DELETE FROM tasks
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY template_task_id, occurrence_date 
      ORDER BY created_at ASC
    ) as rn
    FROM tasks
    WHERE template_task_id IS NOT NULL AND occurrence_date IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 2. Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_template_occurrence 
ON tasks (template_task_id, occurrence_date) 
WHERE template_task_id IS NOT NULL AND occurrence_date IS NOT NULL;
```

### DB Trigger Update (`generate_next_recurring_instance`)
Change the INSERT to include:
```text
ON CONFLICT (template_task_id, occurrence_date) 
WHERE template_task_id IS NOT NULL AND occurrence_date IS NOT NULL
DO NOTHING
```
And handle the case where `v_new_task_id` is null (conflict hit) by skipping the assignee copy.

### Edge Function Update (`generate-recurring-tasks/index.ts`)
After the existing check, add `ON CONFLICT` handling to the insert, or wrap in a try-catch that treats unique violations as "already exists -- skip".

### Files Modified
- `supabase/functions/generate-recurring-tasks/index.ts` -- add conflict handling to insert
- Database migration -- clean duplicates + add unique index + update trigger function
