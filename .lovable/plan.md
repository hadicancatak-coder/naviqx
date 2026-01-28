
# Comprehensive Codebase Cleanup Plan

## Current Codebase Health Score: 6.5/10

The Task Detail refactor is complete and working well (143 lines). However, significant technical debt remains that affects production safety, maintainability, and code organization.

---

## Issue Summary

| Category | Count | Severity |
|----------|-------|----------|
| Console logs in production code | 25+ | **Critical** |
| Deprecated files still imported | 2 files, 10+ imports | High |
| Dead code files | 5 files | Medium |
| Duplicated logic patterns | 3 patterns | Medium |
| Fragmented loading components | 3 components | Low |
| UTM hooks fragmentation | 7 hooks | Low |

---

## Phase 1: Production Safety (Critical)

### 1.1 Replace all console.log/error/warn with logger

Files requiring changes:

| File | Lines | Issue |
|------|-------|-------|
| `src/domain/tasks/actions.ts` | 31, 64, 75, 80, 108, 144, 148, 151 | 8 console calls |
| `src/components/editor/GlobalBubbleMenu.tsx` | 189, 283, 287, 540-546, 574-578 | 6 console calls (diagnostic) |
| `src/contexts/AuthContext.tsx` | 239 | 1 console.error |
| `src/components/ErrorBoundary.tsx` | 27 | 1 console.error |
| `src/pages/NotFound.tsx` | 12 | 1 console.error |
| `src/lib/queryClient.ts` | 28 | 1 console.error |
| `src/lib/monitoring.ts` | 8 | 1 console.log |
| `src/components/ads/SearchAdPreview.tsx` | 28 | 1 console.warn |
| `src/components/ads/AdVariationGeneratorDialog.tsx` | 82 | 1 console.error |
| `src/components/ads/DuplicateAdDialog.tsx` | 123 | 1 console.error |
| `src/hooks/useSystemEntities.ts` | 33, 56, 82, 103 | 4 console.error |
| `src/hooks/useUtmValidation.ts` | 39 | 1 console.error |

**Action**: Import `logger` from `@/lib/logger` and replace:
- `console.log` → `logger.debug`
- `console.warn` → `logger.warn`
- `console.error` → `logger.error`

---

## Phase 2: Delete Dead Code

### 2.1 Files to DELETE

| File | Reason | Lines Removed |
|------|--------|---------------|
| `src/components/AdminRoute.tsx` | Imported but never used in Routes | 34 |
| `src/components/workspace/WorkspaceCard.tsx` | Replaced by BoardCard | 57 |
| `src/hooks/useSpreadsheetSelection.tsx` | Never imported | 111 |
| `src/hooks/useSpreadsheetKeyboard.ts` | Depends on above, never used | ~200 |
| `src/types/spreadsheet.ts` | Only used by above | 58 |

### 2.2 Fix orphaned import in App.tsx

```typescript
// Line 10 - DELETE THIS:
import { AdminRoute } from "./components/AdminRoute";
```

**Total lines removed: ~460**

---

## Phase 3: Remove Deprecated Dependencies

### 3.1 Delete deprecated files

| File | Current Imports | Action |
|------|-----------------|--------|
| `src/lib/taskStatusMapper.ts` | 6 files | Delete after migration |
| `src/hooks/useEntities.ts` | 4 files | Delete after migration |

### 3.2 Update imports

**For taskStatusMapper.ts (6 files):**

| File | Old Import | New Import |
|------|------------|------------|
| `src/lib/taskPrefetch.ts` | `@/lib/taskStatusMapper` | `@/domain` |
| `src/hooks/useTasks.ts` | `@/lib/taskStatusMapper` | `@/domain` |
| `src/hooks/useProfileData.ts` | `@/lib/taskStatusMapper` | `@/domain` |
| `src/hooks/useTaskMutations.ts` | `@/lib/taskStatusMapper` | `@/domain` |
| `src/components/CreateTaskDialog.tsx` | `@/lib/taskStatusMapper` | `@/domain` |

**For useEntities.ts (4 files):**

| File | Old Import | New Import |
|------|------------|------------|
| `src/components/lp-planner/LpSectionLibrary.tsx` | `useEntities` | `useSystemEntities` |
| `src/components/lp-planner/LpSectionDialog.tsx` | `useEntities` | `useSystemEntities` |
| `src/components/lp-planner/LpMapListCompact.tsx` | `useEntities` | `useSystemEntities` |
| `src/components/lp-planner/LpMapList.tsx` | `useEntities` | `useSystemEntities` |

Note: `useSystemEntities` returns `SystemEntity[]` which includes additional fields (`emoji`, `display_order`). The LP Planner components only use `id`, `name`, `code` - compatible.

---

## Phase 4: Fix Status Mapping Duplication

### 4.1 Problem

`src/domain/tasks/actions.ts` duplicates `UI_TO_DB_STATUS` (lines 12-22) to avoid circular imports:

```typescript
// actions.ts line 13 comment:
// This is a copy to avoid circular imports (domain/index imports from actions)
```

### 4.2 Solution

Create `src/domain/tasks/constants.ts` with ONLY the mapping constants:

```typescript
// src/domain/tasks/constants.ts
export const TaskStatusDB = { ... } as const;
export const TaskStatusUI = { ... } as const;
export const STATUS_UI_TO_DB = { ... };
export const STATUS_DB_TO_UI = { ... };
```

Then both `index.ts` and `actions.ts` import from `constants.ts` - no circular import.

---

## Phase 5: Consolidate URL Normalization

### 5.1 Problem

URL normalization pattern duplicated 6+ times:

```typescript
const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
```

Found in:
- `src/hooks/useUtmValidation.ts` (2x)
- `src/lib/lpDetector.ts`
- `src/lib/utmHelpers.ts` (2x)
- `src/components/webintel/UrlEnrichmentService.ts`
- `supabase/functions/check-ads-txt/index.ts`

### 5.2 Solution

Expand `src/lib/urlHelpers.ts` with the robust `normalizeUrl` from comments/utils:

```typescript
// src/lib/urlHelpers.ts
export function normalizeUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.match(/^https?:\/\//i)) return trimmed;
  if (trimmed.includes('://') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function safeParseUrl(url: string): URL | null {
  try {
    return new URL(normalizeUrl(url));
  } catch {
    return null;
  }
}
```

Migrate all 6+ call sites.

---

## Phase 6: Consolidate Loading Components

### 6.1 Current State

| Component | Purpose | Lines |
|-----------|---------|-------|
| `PageLoader` | Full-screen, app init | 12 |
| `PageLoadingSpinner` | Section-level | 30 |
| `PageLoadingState` | Auth-aware wrapper | 74 |

### 6.2 Solution

Create unified `LoadingState` component with variants:

```typescript
// src/components/layout/LoadingState.tsx
interface LoadingStateProps {
  variant: 'fullscreen' | 'section' | 'inline';
  message?: string;
  authAware?: boolean; // Wraps with PageContainer if true
}
```

Then:
- Keep `PageLoader` for App.tsx Suspense (simple, standalone)
- Merge `PageLoadingSpinner` + `PageLoadingState` into one component
- Delete redundant file

---

## Phase 7: Organize Hooks

### 7.1 Current State: 76 hook files in flat structure

UTM-related hooks (7 files):
- `useUtmCampaigns.ts`
- `useUtmLinks.ts`
- `useUtmLpTypes.ts`
- `useUtmMediums.ts`
- `useUtmPlatforms.ts`
- `useUtmTemplates.ts`
- `useUtmValidation.ts`

### 7.2 Solution

Create `src/hooks/utm/index.ts` barrel export:

```typescript
export * from './useUtmCampaigns';
export * from './useUtmLinks';
// ... etc
```

This is low priority - can be done incrementally.

---

## Implementation Order

| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 1: Console cleanup | **Critical** | 1 hour | Production safety |
| Phase 2: Delete dead code | High | 30 min | -460 lines |
| Phase 3: Remove deprecated | High | 30 min | Clean imports |
| Phase 4: Fix status duplication | Medium | 20 min | DRY principle |
| Phase 5: URL normalization | Medium | 30 min | Consistency |
| Phase 6: Loading components | Low | 30 min | UI consistency |
| Phase 7: Hook organization | Low | Optional | Maintainability |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Console calls in prod code | 25+ | 0 |
| Dead code files | 5 | 0 |
| Deprecated imports | 10+ | 0 |
| Lines removed | - | ~600 |
| Codebase health score | 6.5/10 | 8.5/10 |

---

## Verification

After cleanup:
1. Run TypeScript compiler - no errors
2. Search `console.log` in src/ - 0 results (except logger.ts)
3. Search `taskStatusMapper` imports - 0 results
4. Search `useEntities` imports - 0 results
5. Open task detail panel - all fields save correctly
6. Check dashboard loads without errors
