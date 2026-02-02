
# Fix Plan: Enable Recurrence Editing After Task Creation

## Problem Summary

You're absolutely right - **there is no way to edit recurrence settings after a task template is created**. This is a significant gap in the task system. Currently:

1. Recurrence is only configurable in `CreateTaskDialog.tsx`
2. `TaskDetailFields.tsx` and `TaskDetailDetails.tsx` have NO recurrence editing UI
3. Once created, users are stuck with the original schedule (daily instead of weekly on Mondays)

## Root Cause

The recurring task system was built with a "create once, never modify" assumption. The template/instance architecture is solid, but the **editing capability was never implemented**.

## Solution: Add Recurrence Editor to Task Detail

### Component Architecture

```text
TaskDetailFields.tsx (existing)
├── Title (editable) ✓
├── Priority Card ✓
├── Assignees ✓
└── [NEW] RecurrenceEditor (only shows for templates)
    ├── Current schedule display
    ├── Edit button → opens RecurrenceEditSheet
    └── RecurrenceEditSheet
        ├── Type selector (Daily/Weekly/Monthly)
        ├── Days of week (for weekly)
        ├── Day of month (for monthly)
        ├── End condition (never/after N/until date)
        └── Save button → updates template
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/tasks/RecurrenceEditor.tsx` | **CREATE** | New component for editing recurrence |
| `src/components/tasks/RecurrenceEditSheet.tsx` | **CREATE** | Sheet with full recurrence options |
| `src/components/tasks/TaskDetail/TaskDetailFields.tsx` | **MODIFY** | Add RecurrenceEditor for templates |
| `src/hooks/useTaskMutations.ts` | **MODIFY** | Add `updateRecurrence` mutation |
| `src/lib/recurrenceUtils.ts` | **MODIFY** | Add helper to recalculate next_run_at |

## Implementation Details

### 1. New RecurrenceEditor Component

```typescript
// src/components/tasks/RecurrenceEditor.tsx
interface RecurrenceEditorProps {
  taskId: string;
  currentRule: RecurrenceRule | null;
  isTemplate: boolean;
  onUpdate: (rule: RecurrenceRule) => void;
}

// Shows:
// - Current schedule: "Weekly on Mon" with edit button
// - Only visible for is_recurrence_template === true tasks
// - Opens RecurrenceEditSheet on click
```

### 2. New RecurrenceEditSheet Component

```typescript
// src/components/tasks/RecurrenceEditSheet.tsx
// Reuses the same UI from CreateTaskDialog:
// - Type dropdown (none/daily/weekly/monthly)
// - Days of week checkboxes (for weekly)
// - Day of month input (for monthly)
// - End condition (never/after N/until date)
```

### 3. Add to TaskDetailFields

```typescript
// In TaskDetailFields.tsx, after Assignees section:
{task?.is_recurrence_template && (
  <RecurrenceEditor
    taskId={taskId}
    currentRule={task.recurrence_rrule ? JSON.parse(task.recurrence_rrule) : null}
    isTemplate={true}
    onUpdate={(rule) => mutations.updateRecurrence.mutate({ id: taskId, rule })}
  />
)}
```

### 4. New Mutation in useTaskMutations

```typescript
// Add updateRecurrence mutation
const updateRecurrence = useMutation({
  mutationFn: async ({ id, rule }: { id: string; rule: RecurrenceRule }) => {
    const nextRun = calculateFirstOccurrence(rule);
    const { data, error } = await supabase
      .from('tasks')
      .update({
        recurrence_rrule: JSON.stringify(rule),
        recurrence_end_type: rule.end_condition,
        recurrence_end_value: rule.end_value?.toString() || null,
        next_run_at: nextRun?.toISOString() || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => toast({ title: "Recurrence updated" }),
  // ... optimistic updates
});
```

## Technical Considerations

### What Happens to Existing Instances?
- **Already generated instances** remain unchanged (they have their own due dates)
- **Future instances** will follow the new schedule
- The edge function uses `next_run_at` to determine when to generate the next instance

### Edge Cases Handled
1. Changing from daily to weekly: Recalculates `next_run_at` to next valid weekday
2. Changing to "ends after N": Checks current `occurrence_count` 
3. Removing recurrence: Sets `is_recurrence_template = false`, stops generating instances

## UI/UX Design

The recurrence editor will appear in the TaskDetail panel:

```text
┌─────────────────────────────────────┐
│ Task: Mobile Performance Report     │
├─────────────────────────────────────┤
│ Priority: High  │ Status: Ongoing   │
│ Due: Feb 3      │ Sprint: Week 5    │
├─────────────────────────────────────┤
│ 🔄 Recurrence                       │
│ ┌─────────────────────────────────┐ │
│ │ Daily                    [Edit] │ │
│ │ Next: Tomorrow at 9:00 AM       │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Assignees: ...                      │
└─────────────────────────────────────┘
```

Clicking "Edit" opens a sheet with full recurrence options, matching the create dialog.

## Expected Outcome

1. Users can **edit recurrence schedule** from task detail (daily → weekly on Mondays)
2. Changes **immediately reflect** in next_run_at
3. Future task instances follow the **new schedule**
4. UI shows clear **current schedule** with easy edit access
5. Works for both template tasks and legacy recurring tasks

## Testing Steps

1. Open a recurring task template
2. Click "Edit" on recurrence section  
3. Change from "Daily" to "Weekly on Mondays"
4. Save and verify `recurrence_rrule` and `next_run_at` updated in database
5. Wait for cron job or manually trigger - verify next instance is Monday
