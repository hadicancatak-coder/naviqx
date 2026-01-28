
# TaskDetailContext Final Simplification + Codebase Cleanup

## Current State (Honest Assessment)

| Metric | Target | Actual | Gap |
|--------|--------|--------|-----|
| **TaskDetailContext.tsx** | ~120 lines | 287 lines | 167 lines over |
| **useState hooks** | 3-4 | 5 | -1 |
| **useEffect blocks** | 1-2 | 4 | -2 |

The previous refactor did improve the architecture (single source of truth), but **did not aggressively extract** the remaining logic as promised.

## Remaining Extraction Targets

### State Still in Context (lines 103-110):
```typescript
const [parentTask, setParentTask] = useState(null);           // 1 state + 1 effect
const [blockerDialogOpen, setBlockerDialogOpen] = useState(false); // UI state - KEEP
const [blocker, setBlocker] = useState(null);                 // 1 state + 2 functions + 1 effect
const [collaborativeStatus, setCollaborativeStatus] = useState(null); // 1 state + 1 effect + 1 action
const [currentUserProfileId, setCurrentUserProfileId] = useState(null); // 1 state + 1 effect
```

### Effects to Extract (lines 117-172):
- Parent task fetch (12 lines)
- Blocker fetch (25 lines)  
- Collaborative status fetch (12 lines)
- Current user profile ID (12 lines)

## Implementation Plan

### Phase 1: Create 3 New Hooks

**1. useParentTask(parentId: string | null)**
```typescript
// ~15 lines - extracts parent task fetching
export function useParentTask(parentId: string | null) {
  const [parentTask, setParentTask] = useState<{ id: string; title: string } | null>(null);
  
  useEffect(() => {
    if (parentId) {
      supabase.from("tasks").select("id, title").eq("id", parentId).single()
        .then(({ data }) => setParentTask(data));
    } else {
      setParentTask(null);
    }
  }, [parentId]);
  
  return parentTask;
}
```

**2. useTaskBlocker(taskId: string)**
```typescript
// ~25 lines - extracts blocker fetching + dialog state
export function useTaskBlocker(taskId: string) {
  const [blocker, setBlocker] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const fetchBlocker = useCallback(async () => {
    if (!taskId) return;
    const { data } = await supabase
      .from("blockers")
      .select("*")
      .eq("task_id", taskId)
      .eq("resolved", false)
      .maybeSingle();
    setBlocker(data);
  }, [taskId]);
  
  useEffect(() => { fetchBlocker(); }, [fetchBlocker]);
  
  return { blocker, dialogOpen, setDialogOpen, fetchBlocker };
}
```

**3. useCollaborativeTask(taskId: string, isCollaborative: boolean, userId: string | undefined)**
```typescript
// ~45 lines - extracts ALL collaborative logic
export function useCollaborativeTask(taskId: string, isCollaborative: boolean, userId?: string) {
  const [status, setStatus] = useState<CollaborativeStatus | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch status when collaborative
  useEffect(() => { ... }, [isCollaborative, taskId]);
  
  // Fetch current user profile ID
  useEffect(() => { ... }, [userId]);
  
  // Toggle collaborative mode
  const setIsCollaborative = useCallback(async (value: boolean) => { ... }, [...]);
  
  // Check if current user completed
  const currentUserCompleted = status?.assignees.find(a => a.id === currentUserProfileId)?.completed || false;
  
  return { status, setIsCollaborative, currentUserCompleted };
}
```

### Phase 2: Rewrite TaskDetailContext

After extraction, context reduces to:

```typescript
export function TaskDetailProvider({ taskId, cachedTask, children, onClose, onTaskDeleted }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // React Query (single source of truth)
  const { data: task, isLoading } = useTask(taskId, cachedTask);
  const mutations = useTaskMutations();
  
  // Extracted hooks
  const comments = useTaskComments(taskId, user);
  const { assignees: realtimeAssignees, refetch: refetchAssignees } = useRealtimeAssignees("task", taskId);
  const { data: changeLogs = [] } = useTaskChangeLogs(taskId);
  const parentTask = useParentTask(task?.parent_id);
  const blocker = useTaskBlocker(taskId);
  const collaborative = useCollaborativeTask(taskId, task?.is_collaborative || false, user?.id);
  
  // Delete action (only remaining callback)
  const deleteTask = useCallback(async () => { ... }, [...]);
  
  // Mark complete (delegates to collaborative or mutations)
  const markComplete = useCallback(async () => { ... }, [...]);
  
  // Derived state
  const loading = isLoading && !task;
  const isCompleted = task?.status === 'Completed';
  const isSubtask = !!task?.parent_id;
  
  return (
    <TaskDetailContext.Provider value={{
      taskId, task, loading, mutations, comments,
      realtimeAssignees, refetchAssignees,
      isCompleted, isSubtask, parentTask,
      ...collaborative, ...blocker,
      changeLogs, markComplete, deleteTask,
    }}>
      {children}
    </TaskDetailContext.Provider>
  );
}
```

**Expected line count: ~90-110 lines** (interface + provider + context creation)

### Phase 3: Delete Unused Code

| File | Action | Reason |
|------|--------|--------|
| `TaskDetailPanel.tsx` | DELETE | Thin wrapper, `TaskDetail` used directly |
| `PanelSkeleton` duplicate | Consolidate | Same component in two files |
| `isRecurring` unused variable | Remove | Line 49 in TaskDetailHeader, never used |

### Phase 4: Update Imports

Update any call sites importing `TaskDetailPanel` to use `TaskDetail` directly:
- Search codebase for `TaskDetailPanel` imports
- Replace with `TaskDetail` from `./TaskDetail`

## Files to Create/Modify

| File | Action | Lines |
|------|--------|-------|
| `src/hooks/useParentTask.ts` | Create | ~15 |
| `src/hooks/useTaskBlocker.ts` | Create | ~25 |
| `src/hooks/useCollaborativeTask.ts` | Create | ~45 |
| `src/components/tasks/TaskDetail/TaskDetailContext.tsx` | Rewrite | 287 → ~100 |
| `src/components/tasks/TaskDetailPanel.tsx` | DELETE | -36 |
| `src/components/tasks/TaskDetail/TaskDetailHeader.tsx` | Fix | Remove unused var |

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| TaskDetailContext.tsx | 287 lines | ~100 lines |
| useState in context | 5 | 0 (moved to hooks) |
| useEffect in context | 4 | 0 (moved to hooks) |
| Total hook files | 4 | 7 (+3 small) |
| Files deleted | 0 | 1 (TaskDetailPanel.tsx) |

## Verification Steps

1. Open any task in the drawer
2. Edit title → verify save on blur
3. Edit description → verify 1s debounce save
4. Close panel mid-edit → verify description saves
5. Change priority/status/due date → verify instant update
6. Set due date to weekend → verify working days warning appears for Mon-Fri users
7. Verify no console errors

## Unused Code Detected

Beyond TaskDetailPanel, here are other cleanup opportunities:

1. **`isRecurring` variable** (TaskDetailHeader.tsx:49) - declared but never rendered
2. **Duplicate skeletons** - `PanelSkeleton` and `TaskDetailSkeleton` are identical
3. **`selectedAssignees`** (TaskDetailDetails.tsx:35) - computed but only used for `length > 1` check, could be simplified
4. **Console.error calls** - should use logger.debug per codebase standard
