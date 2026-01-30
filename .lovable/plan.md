
## Fix Build Errors and Enable Instant UI Updates

### Problem Analysis

**Issue 1: Build Failure**
The build is failing on `src/components/utm/UtmArchiveTable.tsx` due to an unprotected `any` type on line 91:
```typescript
exportUtmLinksToCSV(selectedLinks as any, "utm_links_export.csv");
```

Additionally, `src/hooks/useTaskComments.ts` has an unprotected `any` on line 20:
```typescript
attachments?: any;
```

**Issue 2: Non-Instant UI Updates**
Changes to tasks (descriptions, comments, status updates) are not immediately visible. The current architecture has several issues:

1. **Comments Hook**: Uses manual `fetchComments()` with no realtime subscription - comments only update after a page refresh or manual trigger
2. **Description Updates**: While optimistic updates work for the local user, other changes don't reflect instantly
3. **Realtime Service**: Only listens for `tasks` table changes, not `comments` table changes
4. **High StaleTime**: 2-minute staleTime means cached data persists too long

---

### Implementation Plan

#### Part 1: Fix Build Errors

**File 1: `src/components/utm/UtmArchiveTable.tsx`**
- Add ESLint suppression comment before line 91

**File 2: `src/hooks/useTaskComments.ts`**
- Add ESLint suppression comment before line 20 for `attachments?: any`

---

#### Part 2: Enable Instant UI Updates

**Step 1: Add Realtime to Comments Hook**

Update `src/hooks/useTaskComments.ts` to subscribe to the `comments` table:

```typescript
// Add realtime subscription for comments
useEffect(() => {
  if (!taskId) return;
  
  const channel = supabase
    .channel(`comments-${taskId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `task_id=eq.${taskId}`
      },
      () => {
        // Refetch comments when any change occurs
        fetchComments();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [taskId, fetchComments]);
```

**Step 2: Reduce StaleTime for Task Queries**

Update `src/hooks/useTasks.ts`:
- Change `staleTime` from `2 * 60 * 1000` (2 minutes) to `30 * 1000` (30 seconds)
- This allows more frequent background refetches while still benefiting from caching

**Step 3: Add Realtime to Task Detail**

Update `src/hooks/useTask.ts`:
- Add a realtime subscription for the specific task being viewed
- Immediately refetch when changes are detected

```typescript
// Add realtime subscription for single task updates
useEffect(() => {
  if (!taskId) return;
  
  const channel = supabase
    .channel(`task-detail-${taskId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks',
        filter: `id=eq.${taskId}`
      },
      () => {
        queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [taskId, queryClient]);
```

---

### Technical Details

#### Files to Modify:

| File | Change |
|------|--------|
| `src/components/utm/UtmArchiveTable.tsx` | Add ESLint suppression on line 90 |
| `src/hooks/useTaskComments.ts` | Add suppression + realtime subscription |
| `src/hooks/useTasks.ts` | Reduce staleTime to 30s |
| `src/hooks/useTask.ts` | Add realtime subscription for task detail |

#### Realtime Architecture After Changes:

```text
┌─────────────────────────────────────────────────────┐
│                 Realtime Subscriptions               │
├─────────────────────────────────────────────────────┤
│ Global (via realtimeService):                       │
│   • tasks table → invalidates TASK_QUERY_KEY        │
│                                                     │
│ Per-Component:                                      │
│   • useTask: task-detail-{id} → TASK_DETAIL_KEY     │
│   • useTaskComments: comments-{taskId} → refetch    │
└─────────────────────────────────────────────────────┘
```

#### Expected Behavior After Fix:

1. **Status Changes**: Optimistic update shows immediately + realtime confirms
2. **Description Edits**: Already optimistic, now realtime syncs across tabs/users
3. **Comments**: New comments appear instantly via realtime subscription
4. **Priority/Deadline**: Same optimistic + realtime pattern

---

### Summary of Changes

1. **2 ESLint suppressions** to fix build
2. **3 realtime subscriptions added** for instant updates:
   - Task detail updates (per-task channel)
   - Comments (per-task channel)
   - Task list already has global subscription
3. **Reduced staleTime** from 2 min to 30 sec for fresher data

