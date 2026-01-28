
# Maintenance Items: Hook Organization & ESLint Resolution

## Current Honest Assessment

| Metric | Current State | Impact |
|--------|---------------|--------|
| Hooks folder | 73 flat files | -0.25 (discoverability/maintainability) |
| ESLint violations | ~40+ files with raw Tailwind | -0.5 (design system debt) |
| ESLint failOnError | Disabled (false) | -0.25 (no enforcement) |
| **Adjusted Health Score** | **8.0/10** | Needs honest correction |

The previous 9.0 claim was optimistic. With 40+ ESLint violations still in production code and the hooks folder completely flat, **honest score is 8.0/10**.

---

## Part 1: Hook Folder Organization

### Current State
73 flat files in `src/hooks/` with no logical grouping:

```text
src/hooks/
├── use-mobile.tsx
├── use-toast.ts
├── useAccountStructure.ts
├── useAdComments.ts
├── useAdEditorState.ts
... (69 more files)
```

### Proposed Structure
Organize by domain/feature into 9 subfolders:

```text
src/hooks/
├── index.ts                    # Re-exports for backward compatibility
│
├── auth/                       # Authentication & user
│   ├── useAuth.ts             # Already exists in contexts
│   ├── useUserRole.ts
│   └── useGoogleAuth.ts
│
├── tasks/                      # Task management (15 files)
│   ├── useTask.ts
│   ├── useTasks.ts
│   ├── useTaskMutations.ts
│   ├── useMyTasks.ts
│   ├── useSubtasks.ts
│   ├── useTaskBlocker.ts
│   ├── useTaskChangeLogs.ts
│   ├── useTaskComments.ts
│   ├── useTaskWatchers.ts
│   ├── useParentTask.ts
│   ├── useCollaborativeTask.ts
│   └── index.ts
│
├── campaigns/                  # Campaign & UTM (12 files)
│   ├── useUtmCampaigns.ts
│   ├── useUtmLinks.ts
│   ├── useUtmLpTypes.ts
│   ├── useUtmMediums.ts
│   ├── useUtmPlatforms.ts
│   ├── useUtmTemplates.ts
│   ├── useUtmValidation.ts
│   ├── useCampaignComments.ts
│   ├── useCampaignMetadata.ts
│   ├── useCampaignVersions.ts
│   ├── useCampaignEntityTracking.ts
│   ├── useWebsiteCampaigns.ts
│   └── index.ts
│
├── ads/                        # Ad management (8 files)
│   ├── useAdComments.ts
│   ├── useAdEditorState.ts
│   ├── useAdElements.ts
│   ├── useAdKeyboardShortcuts.ts
│   ├── useAdTemplates.ts
│   ├── useAdVersions.ts
│   ├── useAccountStructure.ts
│   ├── useVersionComments.ts
│   └── index.ts
│
├── lp-planner/                 # LP Planner (7 files)
│   ├── useLpComments.ts
│   ├── useLpLinks.ts
│   ├── useLpMaps.ts
│   ├── useLpOrderPreferences.ts
│   ├── useLpSections.ts
│   ├── useCmsPage.ts
│   └── index.ts
│
├── webintel/                   # WebIntel (3 files)
│   ├── useWebIntelDeals.ts
│   ├── useWebIntelSites.ts
│   └── index.ts
│
├── entities/                   # Shared entity hooks (8 files)
│   ├── useEntityAdRules.ts
│   ├── useEntityComments.ts
│   ├── useEntityPresets.ts
│   ├── useSystemEntities.ts
│   ├── useSystemCities.ts
│   ├── useKeywordDictionaries.ts
│   ├── useKeywordLists.ts
│   ├── useGdnTargetLists.ts
│   └── index.ts
│
├── data/                       # Data fetching & state (10 files)
│   ├── useProjects.ts
│   ├── useSprints.ts
│   ├── useRoadmap.ts
│   ├── usePhaseProgress.ts
│   ├── useKPIs.ts
│   ├── useDashboardData.ts
│   ├── useProfileData.ts
│   ├── useAppSettings.ts
│   ├── useKnowledgePages.ts
│   ├── useTechStackPages.ts
│   └── index.ts
│
├── integrations/               # External integrations (4 files)
│   ├── useGoogleSheetSync.ts
│   ├── useGoogleSheets.ts
│   ├── useExternalAccess.ts
│   ├── useReviewerSession.ts
│   └── index.ts
│
└── utilities/                  # Generic utilities (7 files)
    ├── use-mobile.tsx
    ├── use-toast.ts
    ├── useCopyToClipboard.ts
    ├── useDebouncedValue.ts
    ├── useKeyboardShortcuts.ts
    ├── usePanelCollapse.ts
    ├── useVisitTracker.ts
    ├── useRealtimeAssignees.ts
    ├── useCopywriterCopies.ts
    └── index.ts
```

### Migration Strategy
1. Create subdirectories and move files
2. Create `index.ts` barrel exports in each subfolder
3. Create root `src/hooks/index.ts` that re-exports everything for backward compatibility
4. Update imports gradually (existing imports continue to work via barrel)

### Backward Compatibility Pattern
```typescript
// src/hooks/index.ts (root barrel)
export * from './auth';
export * from './tasks';
export * from './campaigns';
export * from './ads';
export * from './lp-planner';
export * from './webintel';
export * from './entities';
export * from './data';
export * from './integrations';
export * from './utilities';
```

This means `import { useTask } from '@/hooks'` continues working.

---

## Part 2: ESLint Violations Fix

### Current Violations Summary
| Category | Files | Violations |
|----------|-------|------------|
| Typography (`text-sm`, `text-lg`) | ~28 | ~45 |
| Spacing (`gap-4`, `p-6`, `p-12`) | ~15 | ~25 |
| Colors (`text-white`, `bg-black`, `bg-gray-*`) | ~12 | ~20 |
| **Total** | **~40** | **~90** |

### Priority Fix Files (Highest Violation Count)

| File | Violations | Fix Required |
|------|------------|--------------|
| `src/components/ui/image-lightbox.tsx` | 8+ | `text-white` → `text-foreground`, `text-sm` → `text-body-sm`, `p-4` → `p-md` |
| `src/components/lp-planner/LpCanvas.tsx` | 5 | `p-6` → `p-lg`, `p-12` → `p-2xl`, `text-lg` → `text-heading-sm` |
| `src/components/lp-planner/LpMapBuilder.tsx` | 5 | `p-6` → `p-lg`, `p-12` → `p-2xl` |
| `src/components/lp-planner/LpSectionDetailsDialog.tsx` | 4 | `text-lg` → `text-heading-sm`, `text-xs` → `text-metadata`, `gap-4` → `gap-md` |
| `src/components/lp-planner/LpSectionDrawer.tsx` | 6 | `bg-gray-500/15` → semantic tokens |
| `src/pages/LpMapPublic.tsx` | 5 | `text-lg` → `text-heading-sm`, `text-2xl` → `text-heading-lg` |
| `src/components/ads/SearchAdPreview.tsx` | 3 | `text-lg` → `text-heading-sm`, `text-xl` → `text-heading-md` |
| `src/components/campaigns/ExternalVersionGallery.tsx` | 3 | `bg-black/0` → `bg-background/0`, `text-white` → `text-foreground` |
| `src/components/tasks/StatusMultiSelect.tsx` | 1 | `text-sm` → `text-body-sm` |
| `src/components/tasks/TaskWatchButton.tsx` | 1 | `text-white` → `text-primary-foreground` |
| `src/components/lp-planner/LpSectionDialog.tsx` | 2 | `gap-4` → `gap-md`, `space-y-6` → `space-y-lg` |
| `src/pages/KPIs.tsx` | 1 | `gap-4` → `gap-md` |

### Token Replacement Map

**Typography:**
| Banned | Replacement |
|--------|-------------|
| `text-xs` | `text-metadata` |
| `text-sm` | `text-body-sm` |
| `text-base` | `text-body` |
| `text-lg` | `text-heading-sm` |
| `text-xl` | `text-heading-md` |
| `text-2xl` | `text-heading-lg` |

**Spacing:**
| Banned | Replacement |
|--------|-------------|
| `gap-2` | `gap-sm` |
| `gap-4` | `gap-md` |
| `gap-6` | `gap-lg` |
| `p-4` | `p-md` |
| `p-6` | `p-lg` |
| `p-12` | `p-2xl` |
| `space-y-4` | `space-y-md` |
| `space-y-6` | `space-y-lg` |

**Colors:**
| Banned | Replacement |
|--------|-------------|
| `text-white` | `text-foreground` or `text-primary-foreground` (context-dependent) |
| `bg-black/50` | `bg-background/50` |
| `bg-gray-500/15` | `bg-muted/50` or status color tokens |

### Special Case: Section Type Badge Colors
The `LpSectionDrawer.tsx` uses hardcoded colored badges. These should use **status tokens**:

```typescript
// Before (violates rules)
const sectionTypeBadgeColors = {
  hero: "bg-purple-500/15 text-purple-400",
  features: "bg-blue-500/15 text-blue-400",
  footer: "bg-gray-500/15 text-gray-400",
};

// After (semantic tokens from STYLE_GUIDE)
const sectionTypeBadgeColors = {
  hero: "status-purple",       // Uses bg-purple-soft, text-purple-text
  features: "status-info",     // Uses bg-info-soft, text-info-text
  testimonials: "status-success",
  pricing: "status-amber",
  cta: "status-destructive",
  footer: "status-neutral",
  custom: "status-cyan",
};
```

---

## Part 3: Enable ESLint failOnError

### Current State
```typescript
// vite.config.ts:19-21
eslint({
  failOnWarning: false,
  failOnError: false, // Disabled due to 1700+ legacy violations
})
```

### Target State
After fixing all violations:
```typescript
eslint({
  failOnWarning: false,
  failOnError: true, // Now enforced - violations block build
})
```

---

## Implementation Order

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 1 | Fix ESLint violations (LP Planner cluster) | 6 files | 30 min |
| 2 | Fix ESLint violations (Tasks/Campaigns cluster) | 4 files | 15 min |
| 3 | Fix ESLint violations (UI components) | 4 files | 20 min |
| 4 | Verify zero violations via build | - | 5 min |
| 5 | Enable `failOnError: true` in vite.config.ts | 1 file | 2 min |
| 6 | Create hook subdirectories with barrel exports | 9 folders | 20 min |
| 7 | Move hooks to appropriate folders | 73 files | 30 min |
| 8 | Create root barrel for backward compat | 1 file | 5 min |
| **Total** | | | ~2 hours |

---

## Expected Final Score

| Metric | Before | After |
|--------|--------|-------|
| ESLint violations | 40+ files | 0 files |
| failOnError | false | true |
| Hooks organization | 73 flat files | 9 domain folders |
| **Health Score** | **8.0/10** | **9.5/10** |

---

## Risk Mitigation

**Hook Migration Risks:**
- Circular dependencies: Audit imports before moving
- Breaking imports: Root barrel ensures backward compat
- IDE confusion: May need to restart TypeScript server

**ESLint Risks:**
- Hidden violations: Run full lint after changes
- Build breaks: Test locally before enabling failOnError
