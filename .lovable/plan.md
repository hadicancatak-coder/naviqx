
# Comprehensive Type Safety Fix Plan

## Problem Summary
The build is failing due to **unsuppressed `@typescript-eslint/no-explicit-any` errors** scattered across multiple files. This plan addresses ALL remaining violations to ensure the build passes completely.

---

## Files to Fix (18 files, ~35 fixes)

### Batch 1: Immediate Build-Blocking Errors

| File | Lines | Issue | Fix Strategy |
|------|-------|-------|--------------|
| `src/hooks/useTask.ts` | 39, 97 | `[key: string]: any` index signature, `(ta: any)` mapping | Add ESLint suppression with comment (index sig needed for DB extensibility), type the nested assignee mapping |

### Batch 2: Hook Files (6 files)

| File | Lines | Issue | Fix Strategy |
|------|-------|-------|--------------|
| `src/hooks/useSubtasks.ts` | 90, 119, 128, 153, 175, 186 | Multiple `as any` casts for Supabase inserts/updates and cache callbacks | Add ESLint suppressions for Supabase type gaps, type cache callbacks with `Subtask[]` |
| `src/hooks/useKPIs.ts` | Throughout | Multiple `as any` for mutations | ESLint suppressions with justification comments |
| `src/hooks/useAdVersions.ts` | 9, 40 | `snapshot_data: any`, `versionData: any` | Type as `Record<string, unknown>` or use `Json` from Supabase types |
| `src/hooks/useMyTasks.ts` | 21-281 | `any[]` in props/state | Replace with `TaskWithAssignees[]` from shared types |

### Batch 3: Component Files (9 files)

| File | Lines | Issue | Fix Strategy |
|------|-------|-------|--------------|
| `src/components/TasksTable.tsx` | Multiple | `any[]` and group processing | Import and use `TaskWithAssignees` interface |
| `src/components/InlineEditField.tsx` | 92, 103 | `ref={inputRef as any}` | Type assertion to proper React ref type with ESLint suppression |
| `src/components/dashboard/ActivityFeed.tsx` | 31, 69 | `activity: any` in function and map | Define `ActivityItem` interface based on query shape |
| `src/components/search/DuplicateAdDialog.tsx` | 14 | `ad: any` prop | Define `AdData` interface or import from shared types |
| `src/components/ads/CreateAdDialog.tsx` | 88, 115 | `adData: any` object, `catch (error: any)` | Type `adData` as `Partial<Ad>`, fix catch with `unknown` |
| `src/components/search/SearchBuilderArea.tsx` | 12-14 | `EditorContext` with `any` fields | Define proper interfaces for ad/campaign/adGroup |
| `src/components/ads/ElementQuickInsert.tsx` | 24 | `content: any` parameter | Type as `string \| Record<string, unknown>` |
| `src/components/ads/TemplateSelector.tsx` | 23+ | Multiple `any` casts | Add ESLint suppressions or define template interface |

### Batch 4: Library Files (2 files)

| File | Lines | Issue | Fix Strategy |
|------|-------|-------|--------------|
| `src/lib/undoRedo.ts` | 78-143 | Multiple `any` in command data structures | Replace with `unknown` and type guards, or use `Record<string, unknown>` |
| `src/lib/taskExport.ts` | 3-50 | `UnsafeAny[]` already used | Already using project's `UnsafeAny` pattern - no change needed |

### Batch 5: Edge Functions (2 files)

| File | Lines | Issue | Fix Strategy |
|------|-------|-------|--------------|
| `supabase/functions/verify-mfa-otp/index.ts` | 163 | `catch (error: any)` | Replace with `error: unknown` + `instanceof Error` check |
| `supabase/functions/manage-mfa-session/index.ts` | 197 | `catch (error: any)` | Replace with `error: unknown` + `instanceof Error` check |

---

## Fix Patterns Used

### Pattern 1: Index Signatures (useTask.ts line 39)
```typescript
// BEFORE - causes lint error
[key: string]: any;

// AFTER - suppressed with justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB extensibility requires index signature
[key: string]: any;
```

### Pattern 2: Supabase Nested Query Mapping (useTask.ts line 97)
```typescript
// BEFORE
const assignees = data.task_assignees
  ?.map((ta: any) => ta.profiles)

// AFTER - define interface for nested structure
interface TaskAssigneeJoin {
  user_id: string;
  completed_at: string | null;
  profiles: TaskAssignee | null;
}

const assignees = data.task_assignees
  ?.map((ta: TaskAssigneeJoin) => ta.profiles)
```

### Pattern 3: Cache Callbacks (useSubtasks.ts)
```typescript
// BEFORE
queryClient.setQueryData(['subtasks', pId], (old: any[] | undefined) => { ... })

// AFTER
queryClient.setQueryData(['subtasks', pId], (old: Subtask[] | undefined) => { ... })
```

### Pattern 4: Supabase Insert/Update Casts
```typescript
// BEFORE - breaks build
.insert({ ... } as any)

// AFTER - suppressed with justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase insert type mismatch
.insert({ ... } as any)
```

### Pattern 5: Catch Blocks (Edge Functions)
```typescript
// BEFORE
} catch (error: any) {
  return new Response(JSON.stringify({ error: error.message }), ...)

// AFTER
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'An error occurred';
  return new Response(JSON.stringify({ error: message }), ...)
```

---

## Implementation Order

**Step 1**: Fix `src/hooks/useTask.ts` - Unblock the build immediately (2 fixes)

**Step 2**: Fix remaining hooks in parallel:
- `useSubtasks.ts` (6 fixes)
- `useKPIs.ts` (~5 fixes)
- `useAdVersions.ts` (2 fixes)
- `useMyTasks.ts` (if needed)

**Step 3**: Fix components in parallel:
- `CreateAdDialog.tsx` (2 fixes)
- `InlineEditField.tsx` (2 fixes)
- `ActivityFeed.tsx` (2 fixes)
- `DuplicateAdDialog.tsx` (1 fix)
- `SearchBuilderArea.tsx` (3 fixes)
- `ElementQuickInsert.tsx` (1 fix)
- `TemplateSelector.tsx` (~3 fixes)

**Step 4**: Fix library files:
- `undoRedo.ts` (~8 fixes)

**Step 5**: Fix edge functions and redeploy:
- `verify-mfa-otp/index.ts` (1 fix)
- `manage-mfa-session/index.ts` (1 fix)

---

## Technical Notes

- Files already using `UnsafeAny` pattern (like `taskExport.ts`) are acceptable - no changes needed
- Files with existing ESLint suppressions (like `TaskListView.tsx`, `AdListPanel.tsx`) are already compliant
- The `src/types/tasks.ts` index signature already has suppression comment - no change needed
- Some Supabase type mismatches require `as any` casts due to schema/types.ts gaps - these get suppression comments

## Expected Outcome
After all fixes:
- Build passes with **0 TypeScript/ESLint errors**
- All `any` types either properly typed or suppressed with justification
- Edge functions automatically redeployed
- No runtime behavior changes
