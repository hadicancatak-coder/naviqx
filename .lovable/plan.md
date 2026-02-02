
# Fix Plan: Recurring Task Disappearing After Creation

## Root Cause Analysis

When you create a recurring task, TWO things happen:

1. A **template** is created (with `is_recurrence_template=true`) - this is HIDDEN from the task list
2. An **instance** should be generated based on `next_run_at` - this is VISIBLE

The problem: Your "Daily Budget Table" template exists but has NO visible instances because:

| Issue | Current Behavior | Expected Behavior |
|-------|-----------------|-------------------|
| `next_run_at` calculation | Set to today at 12:00 AM (already in the past!) | Should be set to TODAY or TOMORROW at a future time |
| First instance creation | Relies on hourly cron job | Should create first instance IMMEDIATELY upon template creation |

## The Fix

### Part 1: Create First Instance Immediately

When a recurring template is created, generate the first instance right away instead of waiting for the cron job.

**File: `src/components/CreateTaskDialog.tsx`**

After creating the template, immediately create the first task instance:

```typescript
// After template is created successfully...
if (isRecurring && createdTask.id) {
  // Create first instance immediately
  const firstInstanceDate = nextRunAt || new Date();
  const occurrenceDateStr = format(firstInstanceDate, 'yyyy-MM-dd');
  
  const { data: firstInstance } = await supabase
    .from('tasks')
    .insert({
      title: createdTask.title,
      description: createdTask.description,
      priority: createdTask.priority,
      status: 'Pending',
      due_at: firstInstanceDate.toISOString(),
      entity: createdTask.entity,
      project_id: createdTask.project_id,
      labels: createdTask.labels,
      created_by: user!.id,
      template_task_id: createdTask.id,
      occurrence_date: occurrenceDateStr,
      task_type: 'recurring',
      is_collaborative: createdTask.is_collaborative ?? false,
    })
    .select()
    .single();
    
  // Copy assignees to the first instance
  if (firstInstance && selectedAssignees.length > 0) {
    await supabase.from('task_assignees').insert(
      selectedAssignees.map(profileId => ({
        task_id: firstInstance.id,
        user_id: profileId,
      }))
    );
  }
  
  // Update template's next_run_at to NEXT occurrence (tomorrow for daily)
  const nextOccurrence = calculateNextOccurrence(rule, firstInstanceDate, 1);
  await supabase
    .from('tasks')
    .update({ 
      next_run_at: nextOccurrence?.toISOString() || null,
      occurrence_count: 1 
    })
    .eq('id', createdTask.id);
}
```

### Part 2: Fix `calculateFirstOccurrence` for Daily Tasks

The function returns "today" for daily tasks, which can be problematic if it's already past the intended time.

**File: `src/lib/recurrenceUtils.ts`**

```typescript
// Line 162: For daily tasks, still use today as the first occurrence
// This is correct - the issue is we need to CREATE the instance immediately
return today;
```

This is actually correct - the first occurrence SHOULD be today. The real issue is that we're not creating the instance immediately.

### Part 3: Fix the Template's next_run_at

After creating the first instance, `next_run_at` should point to the NEXT occurrence (tomorrow for daily).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/CreateTaskDialog.tsx` | Create first instance immediately after template |
| `src/lib/recurrenceUtils.ts` | No changes needed (logic is correct) |

## Immediate Database Fix

For the existing "Daily Budget Table" template, I need to:

1. Manually create a task instance for today
2. Update the template's `next_run_at` to tomorrow

This is a one-time fix for the stuck template.

---

## User Experience After Fix

```text
1. User creates "Daily Budget Table" with Daily recurrence
2. Template created (hidden) with next_run_at = tomorrow
3. First instance created immediately (visible!) for today
4. User sees the task in their list immediately
5. Tomorrow, cron generates next instance from template
```

## Implementation Summary

The key insight is: **Don't rely on the cron job for the FIRST instance**. Create it immediately when the user clicks "Create", then let the cron handle future occurrences.

## Technical Details

### CreateTaskDialog.tsx Changes

Add new code after line ~186 where the template is created:

```typescript
if (isRecurring && createdTask.id) {
  // Immediately create the first visible task instance
  const firstOccurrenceDate = nextRunAt || startOfDay(new Date());
  const instanceDateStr = format(firstOccurrenceDate, 'yyyy-MM-dd');

  const { data: firstInstance, error: instanceError } = await supabase
    .from('tasks')
    .insert({
      title: title.trim(),
      description: description || null,
      priority,
      status: 'Pending',
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
    })
    .select()
    .single();

  if (!instanceError && firstInstance) {
    // Copy assignees to first instance
    if (selectedAssignees.length > 0 && creatorProfile) {
      await supabase.from('task_assignees').insert(
        selectedAssignees.map(profileId => ({
          task_id: firstInstance.id,
          user_id: profileId,
          assigned_by: creatorProfile.id,
        }))
      );
    }

    // Advance template to next occurrence
    const rule: RecurrenceRule = {
      type: recurrence,
      interval: 1,
      days_of_week: recurrence === 'weekly' ? recurrenceDaysOfWeek : undefined,
      day_of_month: recurrence === 'monthly' ? (recurrenceDayOfMonth || undefined) : undefined,
      end_condition: recurrenceEndType,
      end_value: recurrenceEndType === 'after_n' 
        ? parseInt(recurrenceEndValue) || 10 
        : recurrenceEndType === 'until_date' 
          ? recurrenceEndValue 
          : undefined,
    };
    
    const nextOccurrence = calculateNextOccurrence(rule, firstOccurrenceDate, 1);
    
    await supabase
      .from('tasks')
      .update({
        next_run_at: nextOccurrence?.toISOString() || null,
        occurrence_count: 1,
      })
      .eq('id', createdTask.id);
  }
}
```

### Edge Function Coordination

The cron job already handles `occurrence_count` correctly, so once we set it to 1 after creating the first instance, future runs will work properly.
