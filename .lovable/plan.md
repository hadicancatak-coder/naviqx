

# Unify Task Status: Replace Pending with Backlog

## Problem Summary

Your app has a confusing split between UI and database:
- **Database enum**: `Pending`, `Ongoing`, `Blocked`, `Completed`, `Failed`
- **UI labels**: `Backlog`, `Ongoing`, `Blocked`, `Completed`, `Failed`

This causes constant mapping bugs and confusion. You want them to match.

---

## Your Status Definitions (Business Logic)

| Status | Meaning |
|--------|---------|
| **Backlog** | Planned but not started yet |
| **Ongoing** | Currently being worked on |
| **Blocked** | Stopped due to a reason (requires reason) |
| **Completed** | Done |
| **Failed** | Failed (requires reason) |

---

## Solution: Three-Step Fix

### Step 1: Database Migration

Add `Backlog` to the enum and migrate all `Pending` data:

```sql
-- 1. Add 'Backlog' to the task_status enum
ALTER TYPE task_status ADD VALUE 'Backlog';

-- 2. Migrate all existing 'Pending' tasks to 'Backlog'
UPDATE tasks SET status = 'Backlog' WHERE status = 'Pending';
```

**Data Impact**: ~10 tasks will be updated from `Pending` → `Backlog`. No data loss.

### Step 2: Code Updates

Replace all `'Pending'` references with `'Backlog'` in task-related files:

| File | Change |
|------|--------|
| `src/domain/tasks/constants.ts` | Change `TaskStatusDB.Pending` → `TaskStatusDB.Backlog` |
| `src/domain/tasks/index.ts` | Update `TASK_STATUS_OPTIONS` dbValue |
| `src/hooks/useSubtasks.ts` | New subtasks: `status: 'Backlog'` |
| `src/hooks/useTaskMutations.ts` | Type union uses `'Backlog'` |
| `src/components/CreateTaskDialog.tsx` | Template status: `'Backlog'` |
| `src/components/tasks/TaskListView.tsx` | Duplicate/uncomplete: `'Backlog'` |
| `src/components/tasks/TaskBoardView.tsx` | Column filter uses `'Backlog'` |
| `src/components/tasks/UnifiedTaskBoard.tsx` | Column id: `'Backlog'` |
| `src/components/sprints/SprintKanban.tsx` | Column id: `'Backlog'` |
| `src/components/dashboard/OverdueTasks.tsx` | Exclude filter: `'Backlog'` |
| `src/lib/overdueHelpers.ts` | Exclude `'Backlog'` from overdue |
| `src/pages/Tasks.tsx` | Status filter matches `'Backlog'` |
| `src/components/projects/ProjectTasksSection.tsx` | Status icon key |
| `src/components/admin/TaskAnalyticsDashboard.tsx` | Count filter |
| `src/domain/tasks/actions.ts` | Default fallback |
| `supabase/functions/generate-recurring-tasks/index.ts` | Inherit template status or `'Backlog'` |
| `supabase/functions/daily-notification-scheduler/index.ts` | `.in("status", ["Backlog", "Ongoing"])` |

### Step 3: Simplify Domain Constants

Remove the mapping complexity since UI and DB now match:

```typescript
// src/domain/tasks/constants.ts

export const TaskStatus = {
  Backlog: 'Backlog',      // Was Pending
  Ongoing: 'Ongoing',
  Blocked: 'Blocked',
  Completed: 'Completed',
  Failed: 'Failed',
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// No more separate UI/DB enums needed!
// Keep simple mappers for backward compatibility that just return input
export const mapStatusToDb = (status: string): TaskStatusType => 
  status as TaskStatusType;

export const mapStatusToUi = (status: string): TaskStatusType => 
  status as TaskStatusType;
```

---

## Files to Modify

| Category | Files |
|----------|-------|
| **Database** | Migration to add `Backlog` enum value and update data |
| **Domain** | `src/domain/tasks/constants.ts`, `src/domain/tasks/index.ts`, `src/domain/tasks/actions.ts` |
| **Components** | `src/components/CreateTaskDialog.tsx`, `src/components/tasks/TaskListView.tsx`, `src/components/tasks/TaskBoardView.tsx`, `src/components/tasks/UnifiedTaskBoard.tsx`, `src/components/sprints/SprintKanban.tsx`, `src/components/tasks/TaskRow.tsx`, `src/components/projects/ProjectTasksSection.tsx`, `src/components/dashboard/OverdueTasks.tsx`, `src/components/admin/TaskAnalyticsDashboard.tsx` |
| **Hooks** | `src/hooks/useSubtasks.ts`, `src/hooks/useTaskMutations.ts` |
| **Pages** | `src/pages/Tasks.tsx` |
| **Lib** | `src/lib/overdueHelpers.ts`, `src/lib/constants.ts` |
| **Edge Functions** | `supabase/functions/generate-recurring-tasks/index.ts`, `supabase/functions/daily-notification-scheduler/index.ts` |

---

## Outcome After Implementation

```text
Database enum:  'Backlog' | 'Ongoing' | 'Blocked' | 'Completed' | 'Failed'
                         ↑
                    (Pending still exists in enum but unused)

UI labels:      'Backlog' | 'Ongoing' | 'Blocked' | 'Completed' | 'Failed'
                         ↑
                    (Perfect match!)

Mapping layer:  Simplified to pass-through (no conversion needed)
```

**Benefits:**
- No more confusion between Pending/Backlog
- No mapping bugs
- Cleaner, simpler code
- UI and DB speak the same language

---

## Technical Notes

1. **Enum values can't be removed** - `Pending` stays in the PostgreSQL enum but won't be used
2. **The migration is safe** - PostgreSQL allows adding enum values without table rewrites
3. **Backward compatibility** - Keep `mapStatusToDb`/`mapStatusToUi` as pass-through functions to avoid breaking existing imports
4. **Edge functions** - Must be redeployed after changes

