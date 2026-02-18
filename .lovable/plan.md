
# Recurring Tasks System Redesign

## Root Cause Analysis

The recurring tasks system has **two critical failures**:

1. **The cron job stopped firing** -- there are zero logs for `generate-recurring-tasks`, meaning the hourly cron hasn't been executing. The function works perfectly when called manually (just tested it -- it created 7 tasks), but the scheduler isn't triggering it.

2. **No catch-up logic** -- When the cron misses runs, each invocation only generates ONE overdue instance and advances `next_run_at` by one interval. So if "Daily Checklist" missed 28 days, it would take 28 separate hourly runs to catch up. Right now templates are stuck weeks behind:
   - "Daily Checklist" stuck at Jan 20
   - "Daily Report Updates" stuck at Jan 15
   - "Seminars Report" stuck at Feb 2

## How Major Platforms Handle This

**Todoist / ClickUp (Completion-Triggered Model):**
- A recurring task is a SINGLE task that resets when completed
- When you complete it, the due date advances to the next occurrence and status resets
- No cron jobs, no background generation -- 100% reliable
- Drawback: No historical instance tracking

**Asana (Hybrid):**
- Creates the next instance only when the current one is completed
- One active instance at a time per template
- History preserved through completed instances

**Monday.com / Linear:**
- Automation/cycle-based -- relies on server-side schedulers similar to what we have

## Recommended Approach: Hybrid Model (Todoist + History)

Combine the reliability of completion-triggered generation with historical tracking:

### Core Changes

**1. Catch-up logic in the edge function (immediate fix)**
- When the function runs, if `next_run_at` is far behind today, generate ALL missed instances in a single batch (up to a configurable cap of 7 days)
- For anything older than 7 days, skip and fast-forward to today
- This prevents the "one-at-a-time crawl" problem

**2. Completion-triggered generation (reliability layer)**
- When a user completes a recurring task instance, automatically generate the NEXT instance right then
- This happens in real-time via a database trigger -- no cron dependency
- The cron becomes a safety net, not the primary mechanism

**3. Fix the cron job**
- Add `verify_jwt = false` to the function config so the cron can call it without auth
- Set up a proper `pg_cron` + `pg_net` schedule as a backup

**4. "Ensure Today" check on app load**
- When a user opens the Tasks page, run a lightweight client-side check
- If any template's `next_run_at` is in the past, call the edge function once
- This guarantees users always see today's tasks even if the cron failed

### Architecture Diagram

```text
CURRENT (Fragile):
  Cron (hourly) --> Edge Function --> Create 1 instance --> Advance next_run_at
  (If cron fails, everything stops)

NEW (Resilient - 3 layers):
  Layer 1: User completes task --> DB trigger --> Create next instance immediately
  Layer 2: Cron (hourly) --> Edge function --> Batch catch-up for ALL overdue
  Layer 3: App load --> Client check --> Call edge function if any templates overdue
```

## Technical Implementation

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/generate-recurring-tasks/index.ts` | Add batch catch-up loop: generate ALL overdue instances (max 7 days back), fast-forward if older |
| `supabase/config.toml` | Add `[functions.generate-recurring-tasks]` with `verify_jwt = false` |
| Database migration | Create trigger `on_recurring_task_completed` that auto-generates next instance when an instance task is completed |
| `src/hooks/useTasks.ts` | Add a one-time "ensure today" check that calls the edge function if templates are overdue |
| `src/domain/tasks/actions.ts` | After completing a recurring instance, trigger next-instance creation client-side as a fallback |

### Database Trigger: Auto-Generate on Completion

A new trigger on the `tasks` table that fires when a task with `template_task_id` has its status changed to `Completed`. It will:
1. Look up the parent template's recurrence rule
2. Calculate the next occurrence date from today
3. Check if an instance already exists for that date
4. If not, create it with the same assignees, labels, and metadata
5. Update the template's `next_run_at` and `occurrence_count`

This makes the system self-healing -- even if the cron never fires again, completing today's task creates tomorrow's.

### Edge Function Catch-Up Logic

```text
For each overdue template:
  while next_run_at <= today:
    if (today - next_run_at) > 7 days:
      fast-forward next_run_at to today (skip ancient backlog)
      break
    else:
      create instance for next_run_at date
      advance next_run_at by one interval
```

### Immediate Data Fix

As part of the migration, reset all templates whose `next_run_at` is more than 7 days old to today, so they start fresh without generating a backlog of phantom tasks.

## Summary

The current system relies entirely on a cron job that has silently stopped. The redesign adds three layers of reliability so recurring tasks always appear:
1. **Completion trigger** -- most reliable, user-driven
2. **Cron with catch-up** -- batch safety net
3. **Client-side check** -- last resort on app load
