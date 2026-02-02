
# Build Fix Plan: Eliminating All `@typescript-eslint/no-explicit-any` Errors

## Problem Summary
Your build has been failing due to **unsuppressed `any` types** across multiple files. The ESLint rule `@typescript-eslint/no-explicit-any` is set to `error` level, causing immediate build failures.

After thorough investigation, I identified **25+ instances** across **16 files** that need to be fixed.

---

## Files to Fix (Grouped by Category)

### Category 1: Hook Files (13 files, ~24 fixes)

| File | Lines | Issue |
|------|-------|-------|
| `src/hooks/useUtmMediums.ts` | 49, 82, 102 | `onError: (error: any)` in 3 mutations |
| `src/hooks/useEntityComments.ts` | 76, 94, 112 | `onError: (error: any)` in 3 mutations |
| `src/hooks/useVersionComments.ts` | 132, 151, 169, 194 | `onError: (error: any)` in 4 mutations |
| `src/hooks/useCampaignComments.ts` | 99, 138, 156 | `onError: (error: any)` in 3 mutations |
| `src/hooks/useSubtasks.ts` | 162, 193, 222, 247 | `onError: (error: any)` in 4 mutations |
| `src/hooks/useWebsiteCampaigns.ts` | 57, 77 | `onError: (error: any)` in 2 mutations |

### Category 2: Component Files (4 files, ~8 fixes)

| File | Lines | Issue |
|------|-------|-------|
| `src/components/utm/UtmMediumManager.tsx` | 65, 106 | Function params `(medium: any)` |
| `src/components/TasksTable.tsx` | 69-70, 74, 249 | Mutation callbacks with `any` |
| `src/components/UserManagementDialog.tsx` | 94, 122, 158 | `catch (error: any)` blocks |
| `src/components/ReportDialog.tsx` | 52 | `catch (error: any)` |
| `src/components/ProjectDialog.tsx` | 104 | `catch (error: any)` |
| `src/components/tasks/SortableTaskList.tsx` | 182 | `catch (error: any)` |

### Category 3: Edge Functions (2 files, 2 fixes)

| File | Lines | Issue |
|------|-------|-------|
| `supabase/functions/reschedule-overdue-tasks/index.ts` | 48 | `catch (error: any)` |
| `supabase/functions/delete-users/index.ts` | 80 | `catch (error: any)` |

---

## Fix Strategy

For each category, I will apply the project's established pattern:

### Pattern 1: Mutation `onError` callbacks
Replace `error: any` with `error: unknown` and use type narrowing:

```typescript
// BEFORE
onError: (error: any) => {
  toast.error(error.message || "Failed");
}

// AFTER
onError: (error: unknown) => {
  toast.error(error instanceof Error ? error.message : "Failed");
}
```

### Pattern 2: `catch` blocks
Same approach with `unknown` and `instanceof` check:

```typescript
// BEFORE
} catch (error: any) {
  toast({ description: error.message });
}

// AFTER
} catch (error: unknown) {
  toast({ description: error instanceof Error ? error.message : "An error occurred" });
}
```

### Pattern 3: Component function parameters
Define proper interfaces based on the Supabase types:

```typescript
// BEFORE (UtmMediumManager.tsx)
const handleOpenDialog = (medium: any = null) => { ... }

// AFTER
interface UtmMediumData {
  id: string;
  name: string;
  display_order: number;
}
const handleOpenDialog = (medium: UtmMediumData | null = null) => { ... }
```

---

## Implementation Order

I will fix files in this sequence to ensure the build passes as quickly as possible:

1. **Hooks first** (they're imported by components)
2. **Components second**
3. **Edge functions last** (need deployment)

### Step-by-Step Execution

**Batch 1 - UTM & Entity Hooks:**
- `useUtmMediums.ts` - 3 fixes
- `useEntityComments.ts` - 3 fixes
- `useWebsiteCampaigns.ts` - 2 fixes

**Batch 2 - Comment Hooks:**
- `useVersionComments.ts` - 4 fixes
- `useCampaignComments.ts` - 3 fixes

**Batch 3 - Task Hooks:**
- `useSubtasks.ts` - 4 fixes

**Batch 4 - UTM Components:**
- `UtmMediumManager.tsx` - 2 fixes (function params + proper interface)

**Batch 5 - Task & Dialog Components:**
- `TasksTable.tsx` - 3 fixes
- `SortableTaskList.tsx` - 1 fix
- `UserManagementDialog.tsx` - 3 fixes
- `ReportDialog.tsx` - 1 fix
- `ProjectDialog.tsx` - 1 fix

**Batch 6 - Edge Functions:**
- `reschedule-overdue-tasks/index.ts` - 1 fix
- `delete-users/index.ts` - 1 fix

---

## Expected Outcome

After all fixes are applied:
- Build will pass with **0 TypeScript/ESLint errors**
- All `any` types replaced with proper `unknown` + type narrowing
- Code follows project's established type safety standards
- Edge functions will be automatically redeployed

---

## Technical Notes

- The project has `UnsafeAny` defined in `src/types/unsafe.ts` but I will use proper `unknown` typing with runtime checks where possible
- For component state that already has `eslint-disable` comments (like `editingMedium`, `mediumToDelete`), I will add proper interfaces
- The `no-restricted-syntax` warnings (spacing/typography) are at `warn` level and won't block the build

Approve this plan to begin the fixes.
