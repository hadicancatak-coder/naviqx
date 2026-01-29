
# Systematic ESLint Semantic Token Migration Plan

## Executive Summary

**Problem**: 669 ESLint violations across ~50+ files are blocking all builds. The codebase accumulated technical debt from raw Tailwind classes that now violate the strictly-enforced design system rules.

**Root Cause**: The ESLint config was changed to `"error"` level for all files, but the linter's fail-fast behavior previously masked the full scope. As we fixed individual files, the build progressed and revealed all remaining violations.

**Solution**: Phased migration approach that restores build stability immediately, then systematically converts all violations to semantic tokens.

---

## Phase 0: Immediate Build Restoration (Priority Critical)

**Objective**: Get the build passing within 1 iteration

**Strategy**: Temporarily downgrade ESLint rules from `error` to `warn` so the build passes, then execute the full migration with a working app.

**Changes**:
1. In `eslint.config.js` line 103, change `"error"` to `"warn"` for `no-restricted-syntax`
2. This allows builds to pass while showing warnings
3. After all phases complete, revert to `"error"`

**Why This Approach**:
- Avoids 15+ broken iterations
- Allows testing changes visually as we migrate
- Maintains team productivity
- Honest acknowledgment that 669 violations cannot be fixed in one iteration

---

## Phase 1: Pages Migration (High Visibility)

**Objective**: Fix all violations in `src/pages/` (31 files)

### Batch 1.1 - Current Blockers
| File | Est. Violations | Priority |
|------|-----------------|----------|
| `About.tsx` | 10 | Blocking now |
| `KnowledgePublic.tsx` | 8 | External-facing |
| `ProjectsPublic.tsx` | 12 | External-facing |
| `CampaignReview.tsx` | ~10 | External-facing |

### Batch 1.2 - Core Pages
| File | Est. Violations |
|------|-----------------|
| `Dashboard.tsx` | ~5 |
| `Tasks.tsx` | ~8 |
| `Profile.tsx` | ~6 |
| `Security.tsx` | Done |
| `Notifications.tsx` | ~4 |

### Batch 1.3 - Tool Pages
| File | Est. Violations |
|------|-----------------|
| `SearchPlanner.tsx` | ~10 |
| `LpPlanner.tsx` | ~8 |
| `UtmPlanner.tsx` | ~6 |
| `CopyWriter.tsx` | Done |
| `HowTo.tsx` | Done |

### Batch 1.4 - Remaining Pages
All other pages in `src/pages/` including admin subdirectory

---

## Phase 2: Layout & Shared Components

**Objective**: Fix violations in shared infrastructure components

### Batch 2.1 - Layout Components
| File | Est. Violations |
|------|-----------------|
| `AppSidebar.tsx` | ~15 (complex) |
| `Layout.tsx` | ~5 |
| `TopHeader.tsx` | ~3 |
| `FilterBar.tsx` | Done |
| `PageHeader.tsx` | Done |

### Batch 2.2 - Skeletons & Loading States
Files in `src/components/skeletons/` - Mostly clean

---

## Phase 3: Feature Components

**Objective**: Fix domain-specific components

### Batch 3.1 - Tasks Components
| Directory | Files | Est. Total Violations |
|-----------|-------|----------------------|
| `tasks/` | 32 files | ~80-100 |
| `tasks/TaskDetail/` | Subcomponents | ~20 |

### Batch 3.2 - Dashboard Components
| Directory | Files | Est. Total Violations |
|-----------|-------|----------------------|
| `dashboard/` | 16 files | ~40-50 |

### Batch 3.3 - Campaign & Ads Components
| Directory | Files | Est. Total Violations |
|-----------|-------|----------------------|
| `campaigns/` | Multiple | ~30 |
| `ads/` | Multiple | ~25 |

### Batch 3.4 - Other Feature Components
- `search/` and `search-planner/`
- `lp-planner/`
- `utm/`
- `knowledge/`
- `sprints/`
- `projects/`
- `webintel/`
- `admin/`

---

## Phase 4: UI Components

**Objective**: Fix base UI components (typically well-maintained)

| Priority | Components |
|----------|------------|
| High | `button.tsx`, `card.tsx`, `dialog.tsx`, `sheet.tsx` |
| Medium | `badge.tsx`, `table.tsx`, `tabs.tsx`, `dropdown-menu.tsx` |
| Low | Remaining UI primitives |

---

## Phase 5: Verification & Enforcement

**Objective**: Lock in the migration permanently

1. **Run full ESLint check**: Verify 0 errors
2. **Revert to error level**: Change `"warn"` back to `"error"` in `eslint.config.js`
3. **Visual QA**: Test all pages in light/dark mode
4. **Document exceptions**: Any legitimate `eslint-disable` comments are documented

---

## Token Conversion Reference

| Raw Class | Semantic Token |
|-----------|----------------|
| `text-xs` | `text-metadata` |
| `text-sm` | `text-body-sm` |
| `text-base` | `text-body` |
| `text-lg` | `text-heading-sm` |
| `text-xl` | `text-heading-md` |
| `text-2xl` | `text-heading-lg` |
| `gap-1` | `gap-xs` |
| `gap-2` | `gap-xs` or `gap-sm` |
| `gap-3` | `gap-sm` |
| `gap-4` | `gap-md` |
| `gap-6` | `gap-lg` |
| `gap-8` | `gap-xl` |
| `space-y-1` | `space-y-xs` |
| `space-y-2` | `space-y-xs` |
| `space-y-3` | `space-y-sm` |
| `space-y-4` | `space-y-md` |
| `p-2` | `p-xs` |
| `p-3` | `p-sm` |
| `p-4` | `p-md` |
| `p-6` | `p-lg` |
| `px-3`, `py-3` | `px-sm`, `py-sm` |
| `px-4`, `py-4` | `px-md`, `py-md` |
| `px-6`, `py-6` | `px-lg`, `py-lg` |
| `m-2`, `mt-2`, `mr-2` | `m-xs`, `mt-xs`, `mr-sm` |
| `m-4`, `mb-4` | `m-md`, `mb-md` |
| `m-8`, `mt-8` | `m-xl`, `mt-section` |
| `text-white` | `text-primary-foreground` or context-specific |
| `bg-white` | `bg-card` or `bg-background` |
| `bg-gray-*` | `bg-muted`, `bg-subtle`, or status tokens |

---

## Technical Notes

### Estimated Effort
- **Phase 0**: 1 iteration
- **Phase 1**: 3-4 iterations
- **Phase 2**: 1-2 iterations
- **Phase 3**: 4-5 iterations
- **Phase 4**: 1-2 iterations
- **Phase 5**: 1 iteration

**Total**: ~12-15 iterations for full migration

### Files Already Migrated
- `src/pages/Security.tsx` - Done
- `src/pages/HowTo.tsx` - Done
- `src/pages/CopyWriter.tsx` - Done
- `src/pages/LpMapPublic.tsx` - Done (except 1 false positive fixed with `!pt-0`)

### Exception Pattern
For legitimate cases requiring raw values (e.g., resets, external component overrides):
```tsx
// eslint-disable-next-line no-restricted-syntax -- [reason]
className="pt-0"
```

---

## Next Steps After Approval

1. Execute Phase 0 to restore build stability
2. Begin Phase 1 Batch 1.1 with `About.tsx` (current blocker)
3. Proceed systematically through remaining batches
4. Provide progress updates after each phase completion
