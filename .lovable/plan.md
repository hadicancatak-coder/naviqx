
# Fix Plan: Complete Status Unification and Collaborative Task Bug

## Problem Summary

The previous migration added "Backlog" to the database and migrated data, but **several UI components still reference "Pending"**. Additionally, when creating recurring tasks, the `is_collaborative` flag is NOT being copied to the first instance.

## Issues Found

| File | Line(s) | Issue |
|------|---------|-------|
| `src/components/tasks/TaskBoardView.tsx` | 76, 88 | Filters for `'Pending'`, toggles uncomplete to `'Pending'` |
| `src/components/TasksTableVirtualized.tsx` | 125-126, 133, 295 | `'Pending'` in color maps and SelectItem |
| `src/pages/Profile.tsx` | 463 | Tab labeled "Pending" instead of "Backlog" |
| `src/hooks/useProfileData.ts` | 165 | Filters `status === "Pending"` |
| `src/components/CreateTaskDialog.tsx` | 217-232 | First recurring instance missing `is_collaborative` |

## Fix Details

### 1. TaskBoardView.tsx

**Line 76** - Remove Pending fallback, use Backlog only:
```typescript
// Change from:
if (group === 'Backlog') {
  return tasks.filter(t => t.status === 'Pending' || t.status === 'Backlog');
}

// To:
if (group === 'Backlog') {
  return tasks.filter(t => t.status === 'Backlog');
}
```

**Line 88** - Use Backlog when uncompleting:
```typescript
// Change from:
const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';

// To:
const newStatus = task.status === 'Completed' ? 'Backlog' : 'Completed';
```

### 2. TasksTableVirtualized.tsx

**Line 125-126** - Update switch case:
```typescript
// Change from:
case "Pending":
  return "bg-pending/5";

// To:
case "Backlog":
  return "bg-muted/5";
```

**Line 133** - Update statusColors object:
```typescript
// Change from:
Pending: "bg-pending/15 text-pending border-pending/30",

// To:
Backlog: "bg-muted/15 text-muted-foreground border-border",
```

**Line 295** - Update SelectItem:
```typescript
// Change from:
<SelectItem value="Pending">Pending</SelectItem>

// To:
<SelectItem value="Backlog">Backlog</SelectItem>
```

### 3. Profile.tsx

**Line 463** - Update tab label:
```typescript
// Change from:
<TabsTrigger value="pending" className="rounded-md text-body-sm">Pending ({tasks.pending.length})</TabsTrigger>

// To:
<TabsTrigger value="backlog" className="rounded-md text-body-sm">Backlog ({tasks.backlog.length})</TabsTrigger>
```

**Line 468** - Update the mapping array:
```typescript
// Change from:
{(["all", "ongoing", "completed", "pending", "blocked", "failed"] as const).map((status) => (

// To:
{(["all", "ongoing", "completed", "backlog", "blocked", "failed"] as const).map((status) => (
```

### 4. useProfileData.ts

**Line 165** - Update filter and property name:
```typescript
// Change from:
pending: visibleTasks.filter((t) => t.status === "Pending"),

// To:
backlog: visibleTasks.filter((t) => t.status === "Backlog"),
```

### 5. CreateTaskDialog.tsx - Fix Collaborative Flag

**Lines 217-232** - Add `is_collaborative` to first instance creation:
```typescript
const { data: firstInstance, error: instanceError } = await supabase
  .from('tasks')
  .insert({
    title: title.trim(),
    description: description || null,
    priority,
    status: mapStatusToDb(status),
    due_at: firstOccurrenceDate.toISOString(),
    created_by: user!.id,
    entity: entities.length > 0 ? entities : [],
    labels: tags.length > 0 ? tags : [],
    task_type: 'recurring',
    visibility: 'global',
    project_id: projectId || null,
    template_task_id: createdTask.id,
    occurrence_date: instanceDateStr,
    is_recurrence_template: false,
    is_collaborative: createdTask.is_collaborative ?? false, // ADD THIS LINE
  })
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tasks/TaskBoardView.tsx` | Replace 'Pending' with 'Backlog' (2 locations) |
| `src/components/TasksTableVirtualized.tsx` | Replace 'Pending' with 'Backlog' (3 locations) |
| `src/pages/Profile.tsx` | Update tab value and label from 'pending' to 'backlog' |
| `src/hooks/useProfileData.ts` | Rename property and filter to 'backlog' |
| `src/components/CreateTaskDialog.tsx` | Add `is_collaborative` to first instance |

---

## Outcome After Implementation

```text
Status System:
  Database:  Backlog | Ongoing | Blocked | Completed | Failed
  UI:        Backlog | Ongoing | Blocked | Completed | Failed
  All code:  Uses 'Backlog' consistently everywhere

Collaborative Tasks:
  Template created -> is_collaborative = true
  First instance -> is_collaborative = true (copied from template)
  Cron instances -> is_collaborative = true (already works)
```

---

## Technical Notes

1. The database already has correct data (no more 'Pending' status in any tasks)
2. The mappers in `src/domain/tasks/constants.ts` handle legacy 'Pending' values as fallback
3. After this fix, no UI component will reference 'Pending' for task status
4. All recurring collaborative tasks will correctly propagate the is_collaborative flag
