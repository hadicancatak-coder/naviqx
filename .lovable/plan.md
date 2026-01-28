
# Proper Task Detail Architecture Refactor

## Problem Statement

The current `TaskDetailContext.tsx` is a **640-line monolithic provider** with 20+ manual `useState` hooks, causing:

1. **Description not saving**: Cleanup clears timeout without flushing pending saves
2. **No working days warnings**: `working_days` field missing from all queries
3. **Complex data flow**: Manual state synchronization prone to race conditions
4. **Inconsistent with codebase**: Rest of app uses `useTaskMutations` with optimistic updates

## Solution Architecture

Replace the manual state management with React Query's proven patterns already used elsewhere in the app.

```text
┌─────────────────────────────────────────────────────────────────┐
│                    BEFORE (Current)                             │
├─────────────────────────────────────────────────────────────────┤
│  TaskDetailContext (640 lines)                                  │
│  ├── 20+ useState hooks                                         │
│  ├── Manual fetchTask() → setTask(), setTitle(), setStatus()...│
│  ├── Custom saveField() → individual PATCH requests            │
│  ├── descriptionEditedRef to prevent overwrites                │
│  └── Manual query invalidation                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     AFTER (Proposed)                            │
├─────────────────────────────────────────────────────────────────┤
│  useTask(taskId) hook                                           │
│  ├── React Query with ["task", taskId] key                      │
│  ├── initialData from list cache (instant display)             │
│  ├── Background refetch for fresh data                          │
│  └── Includes working_days in assignee select                   │
│                                                                  │
│  useTaskMutations (existing)                                    │
│  ├── Optimistic updates to ["tasks"] cache                      │
│  ├── Also updates ["task", taskId] cache                        │
│  ├── Automatic rollback on error                                │
│  └── Add updateDescription mutation                             │
│                                                                  │
│  TaskDetailContext (simplified ~200 lines)                      │
│  ├── Uses useTask() for data                                    │
│  ├── Uses useTaskMutations() for saves                          │
│  ├── Local form state only for controlled inputs                │
│  └── Working days validation built-in                           │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Create useTask Hook

**New file: `src/hooks/useTask.ts`**

A dedicated hook for fetching a single task by ID with React Query:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TASK_QUERY_KEY } from '@/lib/queryKeys';
import { mapStatusToUi } from '@/lib/taskStatusMapper';

export const TASK_DETAIL_KEY = (taskId: string) => ['task', taskId] as const;

export function useTask(taskId: string, cachedTask?: any) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: TASK_DETAIL_KEY(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignees(
            user_id,
            profiles!task_assignees_user_id_fkey(
              id, user_id, name, username, avatar_url, working_days
            )
          )
        `)
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        status: mapStatusToUi(data.status),
        assignees: data.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || []
      };
    },
    enabled: !!taskId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    // Use cached task from list as placeholder for instant display
    placeholderData: () => {
      if (cachedTask) return cachedTask;
      // Try to find in list cache
      const listData = queryClient.getQueryData(TASK_QUERY_KEY) as any[];
      return listData?.find(t => t.id === taskId);
    },
  });
}
```

### Phase 2: Extend useTaskMutations

**File: `src/hooks/useTaskMutations.ts`**

Add mutations for description and title with optimistic updates to both list and detail caches:

```typescript
// Add to existing useTaskMutations:

// Description mutation with optimistic update
const updateDescription = useMutation({
  mutationFn: async ({ id, description }: { id: string; description: string }) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ description })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onMutate: async ({ id, description }) => {
    // Cancel queries
    await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
    await queryClient.cancelQueries({ queryKey: ['task', id] });
    
    // Snapshot both caches
    const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
    const previousTask = queryClient.getQueryData(['task', id]);
    
    // Optimistically update list cache
    queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
      if (!old) return old;
      return old.map((task: any) =>
        task.id === id ? { ...task, description } : task
      );
    });
    
    // Optimistically update detail cache
    queryClient.setQueryData(['task', id], (old: any) => {
      if (!old) return old;
      return { ...old, description };
    });
    
    return { previousTasks, previousTask };
  },
  onError: (err, { id }, context) => {
    if (context?.previousTasks) {
      queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
    }
    if (context?.previousTask) {
      queryClient.setQueryData(['task', id], context.previousTask);
    }
  },
  // No toast for description - silent save
  onSettled: (data, error, { id }) => {
    queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['task', id] });
  }
});

// Title mutation (similar pattern)
const updateTitle = useMutation({...});
```

### Phase 3: Add Query Key for Single Tasks

**File: `src/lib/queryKeys.ts`**

```typescript
// Add:
export const TASK_DETAIL_KEY = (taskId: string) => ['task', taskId] as const;
```

### Phase 4: Simplify TaskDetailContext

**File: `src/components/tasks/TaskDetail/TaskDetailContext.tsx`**

Refactor from 640 lines to ~200 lines by:

1. Replace manual `fetchTask()` with `useTask()` hook
2. Replace `saveField()` with `useTaskMutations()` 
3. Keep only local form state for controlled inputs (title, description while editing)
4. Remove `descriptionEditedRef` complexity - mutations handle it
5. Add working days validation since data now includes `working_days`

```typescript
// Simplified context structure:
export function TaskDetailProvider({ taskId, cachedTask, ... }) {
  const { data: task, isLoading } = useTask(taskId, cachedTask);
  const mutations = useTaskMutations();
  
  // Local form state only for active editing
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  
  // Sync form state when task loads/changes
  useEffect(() => {
    if (task && !isEditingTitle) setLocalTitle(task.title);
    if (task && !isEditingDescription) setLocalDescription(task.description || '');
  }, [task?.id, task?.title, task?.description]);
  
  // Save handlers use mutations
  const saveTitle = useCallback(() => {
    mutations.updateTask.mutate({ id: taskId, updates: { title: localTitle } });
    setIsEditingTitle(false);
  }, [taskId, localTitle, mutations]);
  
  const saveDescription = useCallback((value: string) => {
    mutations.updateDescription.mutate({ id: taskId, description: value });
  }, [taskId, mutations]);
  
  // ... rest of context
}
```

### Phase 5: Fix Description Component

**File: `src/components/tasks/TaskDetail/TaskDetailDescription.tsx`**

Simplify to use mutations directly:

```typescript
export function TaskDetailDescription() {
  const { task, saveDescription } = useTaskDetailContext();
  const [value, setValue] = useState(task?.description || '');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef(task?.description || '');
  
  // Sync when task changes
  useEffect(() => {
    setValue(task?.description || '');
    lastSavedRef.current = task?.description || '';
  }, [task?.id]);
  
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      if (newValue !== lastSavedRef.current) {
        saveDescription(newValue);
        lastSavedRef.current = newValue;
      }
    }, 1000);
  }, [saveDescription]);
  
  // CRITICAL: Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Use the ref value, not state (may be stale in cleanup)
        const currentValue = document.querySelector('[data-description-editor]')?.textContent || '';
        if (currentValue !== lastSavedRef.current) {
          saveDescription(currentValue);
        }
      }
    };
  }, [saveDescription]);
  
  // ... render
}
```

### Phase 6: Add Working Days Validation

**File: `src/components/tasks/TaskDetail/TaskDetailPriorityCard.tsx`**

Since `useTask` now fetches assignees with `working_days`, validation is straightforward:

```typescript
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateDateForUsers, getDayName, formatWorkingDays } from "@/lib/workingDaysHelper";

export function TaskDetailPriorityCard() {
  const { task, dueDate, setDueDate, saveField } = useTaskDetailContext();
  const [workingDaysWarning, setWorkingDaysWarning] = useState<string | null>(null);
  
  // Validate due date against assignees' working days
  useEffect(() => {
    if (dueDate && task?.assignees?.length > 0) {
      const validation = validateDateForUsers(dueDate, task.assignees);
      if (!validation.isValid) {
        const list = validation.invalidUsers
          .map(u => `${u.name} (${formatWorkingDays(u.workingDays)})`)
          .join(', ');
        setWorkingDaysWarning(`${getDayName(dueDate)} is outside working days for: ${list}`);
      } else {
        setWorkingDaysWarning(null);
      }
    } else {
      setWorkingDaysWarning(null);
    }
  }, [dueDate, task?.assignees]);
  
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm ...">
        {/* Priority, Due Date, Status selectors */}
      </div>
      
      {workingDaysWarning && (
        <Alert variant="destructive" className="mt-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-metadata">
            {workingDaysWarning}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useTask.ts` | Create | New hook for single task queries with React Query |
| `src/lib/queryKeys.ts` | Modify | Add `TASK_DETAIL_KEY` |
| `src/hooks/useTaskMutations.ts` | Modify | Add `updateDescription`, `updateTitle` mutations with dual-cache updates |
| `src/components/tasks/TaskDetail/TaskDetailContext.tsx` | Refactor | Replace manual state with `useTask` + `useTaskMutations` (~440 lines removed) |
| `src/components/tasks/TaskDetail/TaskDetailDescription.tsx` | Simplify | Use context's `saveDescription` with flush-on-unmount |
| `src/components/tasks/TaskDetail/TaskDetailPriorityCard.tsx` | Modify | Add working days validation and warning UI |
| `src/hooks/useRealtimeAssignees.ts` | Modify | Add `working_days` to interface and query |

## Benefits

1. **Instant UI Updates**: Optimistic mutations update cache immediately
2. **Reliable Saves**: Mutations handle all persistence, no race conditions
3. **Working Days Warnings**: Data includes `working_days` from the start
4. **Simpler Code**: Context reduced from 640 to ~200 lines
5. **Consistent Architecture**: Follows patterns used in rest of app
6. **Automatic Rollback**: Failed saves restore previous state automatically
7. **Cache Coherence**: Both list and detail views stay synchronized

## Migration Safety

- No breaking changes to component interfaces
- `useTaskDetailContext` API remains the same
- Gradual refactor possible (can keep old saveField for non-critical fields initially)
- All existing tests continue to work
