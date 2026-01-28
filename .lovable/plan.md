
# Loading Component Consolidation and Skeleton Cleanup Plan

## Current State Assessment

Based on my codebase exploration, here's what's already been completed and what remains:

### Already Completed (No Action Needed)
| Item | Status |
|------|--------|
| `taskStatusMapper.ts` deletion | Done - file deleted |
| `useEntities.ts` deletion | Done - file deleted |
| `useSpreadsheetSelection.tsx` deletion | Done - file deleted |
| `useSpreadsheetKeyboard.ts` deletion | Done - file deleted |
| `WorkspaceCard.tsx` deletion | Done - file deleted |
| Console logs in `actions.ts` | Done - uses `logger` |
| Console logs in `AuthContext.tsx` | Done - uses `logger` |
| Console logs in `useSystemEntities.ts` | Done - uses `logger` |

### Correction: Files That Should NOT Be Deleted

**AdminRoute.tsx** - This file IS actively used:
- Imported in `App.tsx:10`
- Used to wrap admin routes at `App.tsx:96-110`
- Provides security layer for admin dashboard access
- Deleting this would break admin authentication

**spreadsheet.ts** - This file IS actively imported:
- `src/types/report.ts:2` imports `AdvancedSpreadsheetData` and `ChartConfig`
- Used for the Reports feature table element data
- Deleting would cause TypeScript errors

---

## Remaining Work

### 1. Consolidate Loading Components

**Current fragmentation (3 files, 116 lines total):**

| Component | Lines | Purpose |
|-----------|-------|---------|
| `PageLoader.tsx` | 12 | Full-screen app init |
| `PageLoadingSpinner.tsx` | 30 | Section-level with message |
| `PageLoadingState.tsx` | 74 | Auth-aware wrapper with error handling |

**Solution:** Create unified `LoadingState` component with variants:

```text
src/components/layout/LoadingState.tsx (NEW - ~70 lines)
├── variant: 'fullscreen' | 'section' | 'inline'
├── message?: string
├── minHeight?: string
├── withContainer?: boolean (wraps in PageContainer)
├── error state handling (optional)
└── Uses Loader2 icon consistently
```

**Keep `PageLoader.tsx`** for App.tsx Suspense fallback (simple, standalone - used in lazy loading)

**Merge `PageLoadingSpinner` + `PageLoadingState`** into new `LoadingState`

**Delete `PageLoadingSpinner.tsx`** after migration

### 2. Replace Inline Skeleton Duplication

**Files with inline skeletons to update:**

| File | Current Issue | Solution |
|------|---------------|----------|
| `admin/Overview.tsx:82-84` | `Array.from + Skeleton` | Use `StatsSkeleton` |
| `admin/KPIsManagement.tsx:47-54` | Manual skeletons | Use `CardSkeleton` |
| `admin/TeamKPIsManager.tsx:154-156` | `[1,2,3].map` | Use `CardSkeleton` |
| `utm/LpLinksManager.tsx:224-235` | Manual card skeleton | Use `CardSkeleton` |

### 3. Consolidate TaskDetailSkeleton

Move inline `TaskDetailSkeleton` from `TaskDetail/index.tsx:17-28` to shared skeletons folder:

```text
src/components/skeletons/TaskDetailSkeleton.tsx (NEW)
```

---

## Implementation Steps

### Step 1: Create Unified LoadingState Component
Create `src/components/layout/LoadingState.tsx` with:
- `variant` prop for fullscreen/section/inline
- Optional `message` prop
- Optional `withContainer` for PageContainer wrapping
- Optional `error` and `onBack` for error states

### Step 2: Update Import Sites

**For PageLoadingSpinner (3 files):**
- `admin/SprintsManagement.tsx` - Update to `LoadingState variant="section"`
- `admin/SelectorsManagement.tsx` - Update to `LoadingState variant="section"`
- `admin/KPIsManagement.tsx` - Update to `LoadingState variant="section"`

**For PageLoadingState (4 files):**
- `pages/Profile.tsx` - Use new LoadingState with error handling
- `pages/admin/Overview.tsx` - Use new LoadingState
- `pages/admin/UsersManagement.tsx` - Use new LoadingState
- `pages/Sprints.tsx` - Use new LoadingState

### Step 3: Update Barrel Export
Update `src/components/layout/index.ts`:
- Add `LoadingState` export
- Keep `PageLoadingState` as deprecated alias (backward compat)
- Remove `PageLoadingSpinner` export

### Step 4: Delete Redundant File
Delete `src/components/layout/PageLoadingSpinner.tsx`

### Step 5: Replace Inline Skeletons
Update 4 admin components to use shared skeleton components:
- Import `StatsSkeleton` or `CardSkeleton` from `@/components/skeletons`
- Replace manual `Array.from` patterns

### Step 6: Extract TaskDetailSkeleton
Move from inline definition to `src/components/skeletons/TaskDetailSkeleton.tsx`

---

## Files Changed Summary

| Action | File | Lines |
|--------|------|-------|
| Create | `src/components/layout/LoadingState.tsx` | +70 |
| Create | `src/components/skeletons/TaskDetailSkeleton.tsx` | +15 |
| Edit | `src/components/layout/index.ts` | ~3 |
| Edit | `src/pages/admin/Overview.tsx` | ~5 |
| Edit | `src/pages/admin/KPIsManagement.tsx` | ~5 |
| Edit | `src/components/admin/TeamKPIsManager.tsx` | ~5 |
| Edit | `src/components/utm/LpLinksManager.tsx` | ~5 |
| Edit | `src/components/tasks/TaskDetail/index.tsx` | ~3 |
| Delete | `src/components/layout/PageLoadingSpinner.tsx` | -30 |

**Net change: ~+70 lines (new consolidated component), -30 lines (deleted redundant)**

---

## Verification Checklist

After implementation:
1. App.tsx lazy loading works with PageLoader
2. Admin pages show proper loading states
3. Profile page auth-aware loading works
4. Sprints page loading state works
5. No TypeScript errors
6. No duplicate skeleton patterns in admin components
7. TaskDetail drawer shows skeleton while loading
