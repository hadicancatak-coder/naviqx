
# Comprehensive ESLint Violation Fix Plan

## Problem Summary
The build keeps failing because there are **245 ESLint violations across 25+ files**. We've been fixing them one-at-a-time, which is why you keep seeing new errors after each fix.

## Root Cause
The project enforces strict design system rules (semantic tokens instead of raw Tailwind classes), but many files were written before this enforcement. Each build failure reveals only the *first* problematic file, hiding the rest.

## Solution: Batch Fix All Violations

### Phase 1: Critical Pages (Current Blockers)
Fix the immediate build blockers:

| File | Issues |
|------|--------|
| `src/pages/MfaVerify.tsx` | 9 spacing/margin violations, 1 `any` type, 1 hook dependency |
| `src/pages/LpPlanner.tsx` | 1 padding violation (needs eslint-disable) |

### Phase 2: Core UI Components
These affect the entire app:

| File | Issues |
|------|--------|
| `src/components/AppSidebar.tsx` | 36 violations - gap, padding, spacing tokens |
| `src/components/ui/sidebar.tsx` | 30 violations - padding, gap, margin, typography |
| `src/components/ui/button.tsx` | 3 padding violations in size variants |
| `src/components/ui/card.tsx` | 2 padding violations |
| `src/components/layout/TopHeader.tsx` | 1 gap violation |
| `src/components/layout/InternalPageFooter.tsx` | 1 padding violation |
| `src/components/editor/GlobalBubbleMenu.tsx` | 22 violations - padding, gap, margin, any types |

### Phase 3: High-Violation Pages

| File | Issues |
|------|--------|
| `src/pages/Notifications.tsx` | 27 violations - any types, hook deps, spacing |
| `src/pages/Tasks.tsx` | 27 violations - any types, hook deps, spacing |
| `src/pages/Profile.tsx` | 16 violations - any type, spacing |
| `src/pages/Sprints.tsx` | 12 violations - any type, spacing |
| `src/pages/Projects.tsx` | 8 violations - gap, spacing |
| `src/pages/CampaignsLog.tsx` | 9 violations - any types, padding |
| `src/pages/KeywordIntel.tsx` | 6 violations - const, any, margin |
| `src/pages/Knowledge.tsx` | 7 violations - gap, padding, margin |
| `src/pages/TechStack.tsx` | 9 violations - gap, padding, margin, any |
| `src/pages/KPIs.tsx` | 1 gap violation |
| `src/pages/SearchPlanner.tsx` | 10 violations - any types, color |
| `src/pages/UtmPlanner.tsx` | 4 gap violations |
| `src/lib/taskPrefetch.ts` | 2 any type violations |

## Token Mapping Reference
These conversions will be applied:

### Spacing Tokens
```text
gap-1/2/3    → gap-xs (8px)
gap-4        → gap-md (16px)
gap-6        → gap-lg (24px)
gap-8        → gap-xl (32px)

px-3/4       → px-sm/px-md
py-3/4       → py-sm/py-md
p-6          → p-lg

space-y-6/8  → space-y-lg/space-y-xl
mb-2/4       → mb-xs/mb-md
mt-6/8       → mt-lg/mt-section
```

### Type Safety Fixes
```typescript
// Before
catch (error: any) { ... }

// After
catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
}
```

### Hook Dependency Fixes
```typescript
// Before
useEffect(() => { checkSession(); }, []);

// After (with useCallback)
const checkSession = useCallback(async () => { ... }, [navigate]);
useEffect(() => { checkSession(); }, [checkSession]);
```

## Implementation Approach
1. Fix all files in parallel batches (not one-by-one)
2. For UI components that need raw values for layout (like sidebar widths), use `eslint-disable-next-line` comments
3. Run a final verification build to catch any stragglers

## Expected Outcome
- **0 ESLint errors** blocking builds
- Clean, consistent design system usage across all files
- Proper TypeScript types replacing all `any` usages
- Correct React hook dependencies

---

## Technical Details

### Files Requiring `eslint-disable` Exceptions
Some layout-critical code legitimately needs raw values:
- Sidebar collapsed/expanded states with conditional classes
- Container resets like `!p-0`
- Dynamic responsive breakpoints

### Estimated Changes
- ~25 files modified
- ~245 violations resolved
- ~15 `eslint-disable` comments for legitimate exceptions
