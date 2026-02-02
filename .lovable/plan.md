
# Fix Plan: Make Recurring Task Editing User-Friendly

## The Problem

The current system has a hidden "template" concept that users never see:

| What Exists | What User Sees | What User Can Do |
|------------|----------------|-----------------|
| Template (hidden, is_recurrence_template=true) | Nothing | Nothing |
| Instances (visible, template_task_id points to template) | Two identical "Mobile Performance Report" tasks | No way to edit recurrence |

**You're 100% correct** - there should be no hidden "template" concept. Users should see ONE task and edit its recurrence directly.

## Solution: Two-Part Fix

### Part 1: Show Recurrence Editor on Instance Tasks

When you open a recurring task instance, show the recurrence editor with schedule from its parent template. Editing the recurrence updates the template behind the scenes.

**Changes to `TaskDetailFields.tsx`:**
```typescript
// Show recurrence editor for:
// 1. Template tasks (is_recurrence_template === true) - current behavior
// 2. Instance tasks that have a template (template_task_id exists) - NEW
const showRecurrenceEditor = task?.is_recurrence_template || task?.template_task_id;
const templateId = task?.template_task_id || task?.id;
```

**Changes to `RecurrenceEditor.tsx`:**
- Accept `templateTaskId` prop for instances
- Fetch template's `recurrence_rrule` when editing an instance
- Update the template when saving

### Part 2: Consolidate Duplicate Instances in View (Optional Enhancement)

Show only ONE entry per recurring task series in the list, with a way to see all instances.

**Option A - Group instances under template:**
- Show template task with "Recurring" badge
- Expand to see all generated instances

**Option B - Show next due instance only:**
- Filter to show only the next upcoming instance per series
- Past instances move to "Completed" or "History"

## Implementation Details

### File Changes

| File | Change |
|------|--------|
| `src/components/tasks/RecurrenceEditor.tsx` | Support instance tasks, fetch template data |
| `src/components/tasks/TaskDetail/TaskDetailFields.tsx` | Show editor for instances with template_task_id |
| `src/hooks/useTaskMutations.ts` | Handle updating template from instance view |
| `src/components/tasks/TaskDetail/TaskDetailContext.tsx` | Optionally fetch template data for instances |

### RecurrenceEditor Changes

```typescript
interface RecurrenceEditorProps {
  taskId: string;
  templateTaskId?: string; // For instances - the ID of their template
  currentRrule: string | null;
  // ...
}

// Component now works for both templates and instances
// When templateTaskId is provided, it fetches and updates the template
```

### TaskDetailFields Changes

```typescript
// In TaskDetailFields.tsx

// Determine if we should show the recurrence editor
const isTemplate = task?.is_recurrence_template;
const isInstance = !!task?.template_task_id;
const showRecurrenceEditor = isTemplate || isInstance;

// For instances, get template data
const templateTaskId = isInstance ? task.template_task_id : null;

{showRecurrenceEditor && (
  <RecurrenceEditor
    taskId={taskId}
    templateTaskId={templateTaskId}
    currentRrule={isTemplate ? task.recurrence_rrule : null} // Will fetch from template
    nextRunAt={isTemplate ? task.next_run_at : null}
    isTemplate={isTemplate || false}
    isInstance={isInstance}
    onUpdate={(rule) => {
      // Update the template (either this task or the parent template)
      const targetId = templateTaskId || taskId;
      mutations.updateRecurrence.mutate({ id: targetId, rule });
    }}
  />
)}
```

### Mutation Update

The `updateRecurrence` mutation already works - it just needs to receive the correct template ID.

## User Experience After Fix

1. **User opens "Mobile Performance Report"** (the Feb 2 instance)
2. **Sees "Recurrence" section** showing "Daily" with Edit button  
3. **Clicks Edit** → Opens sheet with current schedule
4. **Changes to "Weekly on Mondays"** → Saves
5. **Template is updated** → Next instance will be on Monday
6. **Future instances follow new schedule**

## Visual Change

```text
Before (current - broken):
┌─────────────────────────────────────┐
│ Mobile Performance Report           │
│ Due: Feb 2  │ Status: Backlog       │
│                                     │
│ [No recurrence section visible]     │
│                                     │
│ Assignees: Adel                     │
└─────────────────────────────────────┘

After (fixed):
┌─────────────────────────────────────┐
│ Mobile Performance Report           │
│ 🔄 Recurring Instance               │
│ Due: Feb 2  │ Status: Backlog       │
├─────────────────────────────────────┤
│ Recurrence                          │
│ ┌─────────────────────────────────┐ │
│ │ Daily                    [Edit] │ │
│ │ Next: Feb 3 at 12:00 AM         │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Assignees: Adel                     │
└─────────────────────────────────────┘
```

## Testing

1. Open a recurring task instance (like the ones you see now)
2. Verify "Recurrence" section appears with current schedule
3. Click Edit → Change to "Weekly on Monday"
4. Save and verify the template's `recurrence_rrule` and `next_run_at` are updated
5. Confirm future instances will follow the new Monday schedule
