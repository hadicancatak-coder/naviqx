

# Complete ESLint Batch Fix Plan

## Why This Keeps Happening

**The Core Issue:** The project has **strict ESLint rules that block builds** when any file contains raw Tailwind classes. The build system processes files one-by-one and **fails on the first error it finds**. This means:

1. We fix `MfaSetup.tsx` → Build tries again → Fails on `Profile.tsx`
2. We fix `Profile.tsx` → Build tries again → Fails on `Projects.tsx`
3. And so on...

**The Solution:** Fix ALL remaining files in ONE batch, not one at a time.

---

## Files Still Blocking Build

Based on my analysis, these 10 files still have violations:

| File | Violations | Type |
|------|------------|------|
| `src/pages/Projects.tsx` | 8 | gap, space-y, padding, margin |
| `src/pages/Notifications.tsx` | 27 | any types, hook deps, spacing |
| `src/pages/Tasks.tsx` | 27 | any types, hook deps, spacing |
| `src/pages/Sprints.tsx` | 12 | any type, spacing |
| `src/pages/Knowledge.tsx` | 7 | gap, padding, margin |
| `src/pages/TechStack.tsx` | 9 | gap, padding, margin, any |
| `src/pages/CampaignsLog.tsx` | 9 | any types, padding |
| `src/pages/KeywordIntel.tsx` | 6 | const, any, margin |

---

## What I'll Fix

### Projects.tsx (8 errors)
- Line 176: `gap-4` → `gap-md`
- Line 202: `gap-2` → `gap-xs`
- Line 269: `space-y-2` → `space-y-xs`
- Line 271: `gap-2` → `gap-xs`
- Line 302: `mr-2` → flex with `gap-xs`
- Line 317: `pl-10` → `pl-lg` with eslint-disable
- Line 351: `py-12` → `py-section`
- Line 353: `mb-2` → `mb-xs`

### Notifications.tsx (27 errors)
- Replace all `any` types with proper interfaces
- Wrap functions in `useCallback` for hook dependencies
- Convert raw spacing: `px-12` → `px-lg`, `mt-1` → `mt-xs`, etc.

### Tasks.tsx (27 errors)
- Replace `any` types with Task interfaces
- Fix `useMemo`/`useEffect` dependencies
- Convert: `space-y-4` → `space-y-md`, `gap-2` → `gap-xs`, `mr-2` → flex gap

### Sprints.tsx (12 errors)
- Replace `any` type
- Convert: `mt-1` → `mt-xs`, `mr-2` → flex gap, `gap-2 mt-2` → `gap-xs mt-xs`

### Knowledge.tsx (7 errors)
- Convert: `gap-4 p-4` → `gap-md p-md`, `p-3` → `p-sm`, `p-2` → `p-xs`

### TechStack.tsx (9 errors)
- Replace `any` type
- Convert: `gap-4` → `gap-md`, `p-4` → `p-md`

### CampaignsLog.tsx (9 errors)
- Replace all `any` types
- Convert padding values

### KeywordIntel.tsx (6 errors)
- Change `let` to `const`
- Replace `any` types
- Convert margin values

---

## Token Mapping Quick Reference

```text
Raw Value     → Semantic Token
─────────────────────────────────
gap-2         → gap-xs (8px)
gap-4         → gap-md (16px)
gap-6         → gap-lg (24px)

p-2, p-3      → p-xs, p-sm
p-4           → p-md
p-6           → p-lg

space-y-2     → space-y-xs
space-y-4     → space-y-md

mt-1, mb-1    → mt-xs, mb-xs
mt-2, mb-2    → mb-xs (or mt-xs)
mr-2          → Use gap-xs on parent flex instead

py-12         → py-section
px-10, pl-10  → px-lg, pl-lg
```

---

## Execution Order

I'll fix all 8 files in parallel batches:
1. **Batch 1:** Projects.tsx, Sprints.tsx, Knowledge.tsx, TechStack.tsx
2. **Batch 2:** Notifications.tsx, Tasks.tsx (largest files)
3. **Batch 3:** CampaignsLog.tsx, KeywordIntel.tsx

This ensures zero remaining violations after completion.

