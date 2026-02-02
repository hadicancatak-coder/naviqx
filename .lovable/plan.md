

# Fix Plan: Recurring Tasks Visibility + Build Error

## Problem Analysis

### Issue 1: Recurring Task Not Visible

After investigation, I found the root cause:

**Your recurring task "Mobile Performance Report" was created as a template**, but the Edge Function that generates task instances (`generate-recurring-tasks`) is **not scheduled to run automatically**.

Looking at the data:
```
Title: "Mobile Performance Report"
is_recurrence_template: true  ← This is the TEMPLATE (hidden by design)
next_run_at: 2026-02-01 20:00:00  ← Was due yesterday!
occurrence_count: 0  ← No instances generated yet
```

The problem: **There's no cron job configured** for `generate-recurring-tasks` in `supabase/config.toml`:
```toml
[edge_runtime.cron_jobs]
daily_notifications = { schedule = "0 8 * * *", function = "daily-notification-scheduler" }
daily_security_scan = { schedule = "0 2 * * *", function = "security-scanner" }
# Missing: generate-recurring-tasks!
```

### Issue 2: Build Error (Unrelated but blocking)

The `useCampaignComments.ts` file has a React Hooks violation:
```typescript
// Line 162-164 - WRONG: Calling a hook inside a regular function
const getCommentCount = (trackingId: string) => {
  const { data: comments } = useComments(trackingId);  // ❌ Hooks can't be called here!
  return comments?.length || 0;
};
```

---

## Fix Plan

### Fix 1: Add Cron Job for Recurring Task Generation

**File:** `supabase/config.toml`

Add the missing cron job to run every hour (catching tasks throughout the day):

```toml
project_id = "mwogxqonlzjrkktwbkma"

[edge_runtime.cron_jobs]
daily_notifications = { schedule = "0 8 * * *", function = "daily-notification-scheduler" }
daily_security_scan = { schedule = "0 2 * * *", function = "security-scanner" }
generate_recurring = { schedule = "0 * * * *", function = "generate-recurring-tasks" }

[functions.sync-google-sheet]
verify_jwt = false
```

This schedules the function to run at the **top of every hour**, so tasks are generated promptly when due.

### Fix 2: Trigger Manual Generation for Backlogged Tasks

After adding the cron job, I'll **manually invoke** the `generate-recurring-tasks` function to immediately process the backlog (templates with `next_run_at` in the past).

### Fix 3: Fix React Hooks Violation in useCampaignComments.ts

**File:** `src/hooks/useCampaignComments.ts`

The `getCommentCount` function cannot use hooks inside it. Instead, we remove this helper (it's not being used correctly) or convert it to a proper hook:

**Option A (Remove - Simplest):**
```typescript
// Remove the getCommentCount function entirely since calling hooks
// inside regular functions is not allowed. If comment count is needed,
// the consuming component should use useComments(id).data?.length directly.
```

**Option B (Convert to Hook):**
```typescript
// Convert to a proper hook that can be used by components
const useCommentCount = (trackingId: string) => {
  const { data: comments } = useComments(trackingId);
  return comments?.length || 0;
};
```

I'll implement **Option A** (remove the invalid function) to minimize changes, unless it's actively used somewhere.

---

## Implementation Steps

| Step | Action | Purpose |
|------|--------|---------|
| 1 | Add cron job to `supabase/config.toml` | Schedule automatic recurring task generation every hour |
| 2 | Fix `useCampaignComments.ts` hook violation | Unblock the build |
| 3 | Invoke `generate-recurring-tasks` edge function | Immediately generate missed task instances |
| 4 | Verify tasks appear in list | Confirm fix works |

---

## Expected Outcome

After implementation:
1. **Build passes** - No more React hooks violation
2. **Your "Mobile Performance Report" appears** - The edge function runs and creates an instance
3. **Future recurring tasks generate automatically** - Cron job runs hourly

---

## Technical Notes

- Templates are intentionally hidden from the task list (they're blueprints, not actionable tasks)
- Only **instances** (created by the edge function) appear in your task list
- The dashboard's "Recurring Tasks Today" widget filters for these instances
- Your 5 templates (including "Daily Checklist", "Daily Report Updates", etc.) will all catch up once the function runs

