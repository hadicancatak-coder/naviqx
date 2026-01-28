
# Clean Slate: Task Detail System Simplification

## Current State (Brutally Honest)

| Metric | Current | Problem |
|--------|---------|---------|
| **TaskDetailContext.tsx** | 579 lines | Monolithic, 20+ useState, manual sync |
| **useTaskMutations.ts** | 306 lines | Already good, but duplicated in saveField |
| **Total useState hooks** | 22 | Each creates sync bugs |
| **State sync useEffects** | 4 | Race conditions, data loss |

**Root Cause:** Every field is stored in 3 places:
1. React Query cache (`taskData.title`)
2. Local useState (`title`)  
3. useEffect syncs them (buggy)

**What ACTUALLY needs local state:**
- Title while typing (before blur save)
- Description while typing (before debounce)
- Comment text input
- UI dialogs (delete confirm, blocker dialog)

Everything else can read directly from `task` object.

---

## New Architecture: Single Source of Truth

```text
BEFORE:
  React Query → useEffect sync → useState → child reads → child calls saveField → supabase

AFTER:
  React Query → child reads task.* directly → child calls mutations.* → cache updates instantly
```

---

## Files to DELETE Completely

None. We rewrite in place.

---

## Files to CREATE

| File | Lines | Purpose |
|------|-------|---------|
| `src/hooks/useTaskComments.ts` | ~80 | Extract all comment logic |

---

## Files to REWRITE

### 1. TaskDetailContext.tsx: 579 → ~120 lines

**DELETE these useState hooks (15 total):**
```typescript
// DELETE ALL OF THESE:
const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
const [priority, setPriority] = useState<...>("Medium");
const [status, setStatus] = useState<string>("Ongoing");
const [dueDate, setDueDate] = useState<Date>();
const [tags, setTags] = useState<string[]>([]);
const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
const [projectId, setProjectId] = useState<string | null>(null);
const [phaseId, setPhaseId] = useState<string | null>(null);
const [saving, setSaving] = useState(false);
const [isCollaborative, setIsCollaborativeState] = useState(false);
const [collaborativeStatus, setCollaborativeStatus] = useState<...>(null);
const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
const [users, setUsers] = useState<any[]>([]);
const [blocker, setBlocker] = useState<any>(null);
```

**DELETE the sync useEffect (lines 174-207):**
```typescript
// DELETE THIS ENTIRE BLOCK - root cause of bugs
useEffect(() => {
  if (taskData) {
    setTitle(taskData.title || "");
    setDescription(taskData.description || "");
    setPriority(taskData.priority || "Medium");
    // ... 15 more lines of manual sync
  }
}, [taskData?.id, taskData?.updated_at]);
```

**DELETE saveField function (lines 302-333):**
```typescript
// DELETE - replaced by mutations.*
const saveField = useCallback(async (field: string, value: any) => { ... });
```

**NEW simplified context (~120 lines):**
```typescript
interface TaskDetailContextValue {
  // Core (from useTask)
  taskId: string;
  task: TaskWithAssignees | null;
  loading: boolean;
  
  // Mutations (direct access)
  mutations: ReturnType<typeof useTaskMutations>;
  
  // Comments (extracted hook)
  comments: ReturnType<typeof useTaskComments>;
  
  // Assignees (existing hook)
  realtimeAssignees: any[];
  refetchAssignees: () => void;
  
  // Derived
  isCompleted: boolean;
  isSubtask: boolean;
  parentTask: { id: string; title: string } | null;
  
  // Change logs (existing hook)
  changeLogs: any[];
  
  // Actions
  deleteTask: () => Promise<void>;
  markComplete: () => Promise<void>;
  
  // UI state (only what's needed)
  blockerDialogOpen: boolean;
  setBlockerDialogOpen: (v: boolean) => void;
}

export function TaskDetailProvider({ taskId, cachedTask, children, onClose, onTaskDeleted }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Single source of truth
  const { data: task, isLoading } = useTask(taskId, cachedTask);
  const mutations = useTaskMutations();
  
  // Extracted hooks
  const comments = useTaskComments(taskId, user);
  const { assignees: realtimeAssignees, refetch: refetchAssignees } = useRealtimeAssignees("task", taskId);
  const { data: changeLogs = [] } = useTaskChangeLogs(taskId);
  
  // Parent task (only state needed)
  const [parentTask, setParentTask] = useState<{ id: string; title: string } | null>(null);
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  
  useEffect(() => {
    if (task?.parent_id) {
      supabase.from("tasks").select("id, title").eq("id", task.parent_id).single()
        .then(({ data }) => setParentTask(data));
    } else {
      setParentTask(null);
    }
  }, [task?.parent_id]);
  
  // Delete action
  const deleteTask = useCallback(async () => {
    await supabase.from("tasks").delete().eq("id", taskId);
    queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    toast({ title: "Task deleted" });
    onTaskDeleted?.();
    onClose?.();
  }, [taskId, queryClient, toast, onTaskDeleted, onClose]);
  
  // Mark complete
  const markComplete = useCallback(async () => {
    if (task?.is_collaborative && user) {
      const result = await completeTaskAction(taskId, user.id);
      if (result.success) {
        toast({ title: "Marked complete" });
        queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } else {
      mutations.updateStatus.mutate({ id: taskId, status: 'Completed' });
    }
  }, [task?.is_collaborative, user, taskId, mutations, queryClient, toast]);
  
  return (
    <TaskDetailContext.Provider value={{
      taskId,
      task,
      loading: isLoading && !task,
      mutations,
      comments,
      realtimeAssignees,
      refetchAssignees,
      isCompleted: task?.status === 'Completed',
      isSubtask: !!task?.parent_id,
      parentTask,
      changeLogs,
      deleteTask,
      markComplete,
      blockerDialogOpen,
      setBlockerDialogOpen,
    }}>
      {children}
    </TaskDetailContext.Provider>
  );
}
```

---

### 2. New useTaskComments.ts (~80 lines)

Extract all comment logic from context:

```typescript
export function useTaskComments(taskId: string, user: User | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const fetchComments = useCallback(async () => { /* existing logic */ }, [taskId]);
  const fetchUsers = useCallback(async () => { /* existing logic */ }, []);
  const addComment = useCallback(async () => { /* existing logic */ }, [...]);
  
  useEffect(() => { fetchComments(); fetchUsers(); }, [taskId]);
  
  return {
    comments,
    newComment,
    setNewComment,
    isSubmitting,
    addComment,
    pendingAttachments,
    setPendingAttachments,
    users,
    messagesEndRef,
  };
}
```

---

### 3. Update Child Components (read from task.*, call mutations.*)

**TaskDetailPriorityCard.tsx:**
```typescript
// BEFORE:
const { status, setStatus, priority, setPriority, dueDate, setDueDate, saveField } = useTaskDetailContext();

// AFTER:
const { task, mutations, realtimeAssignees } = useTaskDetailContext();

// Direct mutation calls:
const handlePriorityChange = (p: string) => {
  mutations.updatePriority.mutate({ id: task.id, priority: p });
};

const handleStatusChange = (s: string) => {
  mutations.updateStatus.mutate({ id: task.id, status: s });
};

const handleDateChange = (date: Date | undefined) => {
  mutations.updateDeadline.mutate({ id: task.id, due_at: date?.toISOString() || null });
};
```

**TaskDetailFields.tsx:**
```typescript
// BEFORE:
const { title, setTitle, selectedAssignees, setSelectedAssignees, saveField } = useTaskDetailContext();

// AFTER:
const { task, mutations, realtimeAssignees, refetchAssignees } = useTaskDetailContext();

// Local state only for editing title
const [localTitle, setLocalTitle] = useState(task?.title || '');
const [isEditing, setIsEditing] = useState(false);

const handleTitleBlur = () => {
  if (localTitle !== task?.title) {
    mutations.updateTitle.mutate({ id: task.id, title: localTitle });
  }
  setIsEditing(false);
};
```

**TaskDetailDetails.tsx:**
```typescript
// BEFORE:
const { tags, setTags, projectId, phaseId, saveField, isCollaborative, setIsCollaborative } = useTaskDetailContext();

// AFTER:
const { task, mutations } = useTaskDetailContext();

const handleTagsChange = (newTags: string[]) => {
  mutations.updateTask.mutate({ id: task.id, updates: { labels: newTags } });
};

const handleProjectChange = (projectId: string | null) => {
  mutations.updateTask.mutate({ id: task.id, updates: { project_id: projectId } });
};
```

**TaskDetailDescription.tsx (already good, minor update):**
```typescript
// Already uses task and saveDescription - just update to use mutations directly
const { task, mutations } = useTaskDetailContext();

const saveDescription = (value: string) => {
  mutations.updateDescription.mutate({ id: task.id, description: value });
};
```

**TaskDetailComments.tsx:**
```typescript
// BEFORE:
const { comments, users, messagesEndRef } = useTaskDetailContext();

// AFTER:
const { comments: { comments, users, messagesEndRef } } = useTaskDetailContext();
```

**TaskDetailCommentInput.tsx:**
```typescript
// BEFORE:
const { newComment, setNewComment, isSubmittingComment, addComment, users, pendingAttachments, setPendingAttachments } = useTaskDetailContext();

// AFTER:
const { comments: { newComment, setNewComment, isSubmitting, addComment, users, pendingAttachments, setPendingAttachments }, realtimeAssignees } = useTaskDetailContext();
```

---

## Line Count Comparison

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| TaskDetailContext.tsx | 579 | ~120 | **-459 lines** |
| useTaskComments.ts | 0 | ~80 | +80 (extracted) |
| TaskDetailPriorityCard.tsx | 186 | ~150 | -36 |
| TaskDetailFields.tsx | (current) | ~similar | minimal |
| TaskDetailDetails.tsx | (current) | ~similar | minimal |
| **Net Total** | ~960 | ~500 | **-460 lines** |

---

## What Gets Fixed

| Bug | Fix |
|-----|-----|
| Description not saving on close | useTaskComments cleanup flushes |
| No working days warning | Already done, preserved |
| Slow UI updates | Optimistic mutations already done |
| State sync race conditions | Eliminated - no sync needed |
| saveField duplicating mutations | Deleted, use mutations.* |

---

## Migration Risk

**Low Risk:**
- Context interface changes → TypeScript catches all call sites
- No behavioral changes from user perspective  
- useTask and useTaskMutations already tested

**Testing Required:**
1. Open task detail → fields load correctly
2. Edit title → saves on blur
3. Change priority/status/due date → instant update
4. Add comment with attachments → works
5. Close panel during description edit → saves
6. Working days warning shows for wrong date

---

## Summary

**Aggressive Deletions:**
- 15 useState hooks
- 4 state-sync useEffects  
- saveField function
- ~460 lines of redundant code

**Architecture:**
- React Query = single source of truth
- Mutations = only way to write
- Local state = only during active editing
- Extracted useTaskComments for comment logic

This is a real simplification, not adding more layers.
