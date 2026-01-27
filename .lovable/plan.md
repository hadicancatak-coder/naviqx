
# Site-Wide Improvement Plan - Safe Implementation Strategy

## Executive Summary
This plan addresses 5 key improvement areas discovered during the audit, with a phased approach that prioritizes stability. Each change is designed to be non-breaking and fully testable.

---

## Phase 1: Security - Remove Debug Console Logs (High Priority)

### Problem
Production code contains 15+ `console.log` statements that:
- Leak MFA session tokens (even partially masked)
- Expose user IDs and email addresses
- Reveal internal routing logic to browser devtools

### Files to Modify

| File | Lines | Action |
|------|-------|--------|
| `src/pages/MfaVerify.tsx` | 33, 57, 87-89, 103, 107 | Replace with `logger.debug()` |
| `src/pages/Profile.tsx` | 49-57, 221, 233, 246 | Remove entirely or use `logger.debug()` |
| `src/components/ProtectedRoute.tsx` | 45, 56, 61 | Replace with `logger.debug()` |
| `src/contexts/AuthContext.tsx` | 113-114, 120-123, 126, 137, 156-161, 166, 171, 203, 263-264, 268, 322-329, 357, 364, 384, 399 | Replace with `logger.debug()` |
| `src/components/admin/AdminStatusBadge.tsx` | 26-31 | Remove entirely |
| `src/components/search/DeleteAdDialog.tsx` | 30 | Replace with `logger.debug()` |
| `src/hooks/useKPIs.ts` | 146 | Remove entirely |
| `src/components/editor/GlobalBubbleMenu.tsx` | 56-64 | Replace with `logger.debug()` |
| `src/components/tasks/TaskDetail/TaskDetailDescription.tsx` | 55-58 | Replace with `logger.debug()` |
| `src/hooks/useMyTasks.ts` | 161 | Replace with `logger.debug()` |
| `src/pages/CampaignReview.tsx` | 171 | Replace with `logger.debug()` |

### Implementation Pattern
Use the existing `src/lib/logger.ts` utility which automatically:
- Only logs in development (`import.meta.env.DEV`)
- Silences all info/debug/warn logs in production
- Still reports errors to monitoring

```typescript
// BEFORE (leaks to production)
console.log('✅ MFA session created:', { token: sessionData.sessionToken.substring(0, 10) + '...' });

// AFTER (safe - dev only)
import { logger } from '@/lib/logger';
logger.debug('MFA session created', { hasToken: !!sessionData.sessionToken });
```

### Edge Functions (Backend)
These also need cleanup but run server-side (less critical):
- `supabase/functions/check-admin-status/index.ts` - lines 49-54
- `supabase/functions/admin-reset-mfa/index.ts` - line 55
- `supabase/functions/delete-users/index.ts` - line 39

### Safety Check
- No behavioral changes - only logging removal
- Existing error handling remains intact
- `console.error` calls kept for genuine errors (already in logger pattern)

---

## Phase 2: UX - Complete Breadcrumb Navigation

### Problem
`TopHeader.tsx` is missing breadcrumb labels for 11 routes, causing the header to show only "Naviqx" without context.

### Current Coverage (lines 15-30)
```typescript
// MISSING from getPageName():
- /sprints          -> "Sprints"
- /kpis             -> "KPIs"
- /campaigns-log    -> "Campaigns Log"
- /web-intel        -> "Web Intel"
- /keyword-intel    -> "Keyword Intel"
- /copywriter       -> "Copywriter"
- /projects         -> "Projects"
- /tech-stack       -> "Tech Stack"
- /performance      -> "Performance"
- /ads/search       -> "Search Planner"
- /ads/lp           -> "LP Planner"
```

### Implementation
Update `src/components/layout/TopHeader.tsx` lines 15-30:

```typescript
const getPageName = () => {
  const path = location.pathname;
  
  // Core
  if (path === "/" || path === "/dashboard") return "Dashboard";
  if (path === "/tasks") return "Tasks";
  if (path === "/sprints") return "Sprints";
  if (path === "/calendar") return "Agenda";
  
  // Ads
  if (path === "/ads/search") return "Search Planner";
  if (path === "/ads/lp") return "LP Planner";
  if (path.startsWith("/ads/captions")) return "Captions";
  if (path === "/utm-planner") return "UTM Planner";
  if (path.includes("/ads")) return "Ads";
  
  // Intelligence
  if (path === "/web-intel") return "Web Intel";
  if (path === "/keyword-intel") return "Keyword Intel";
  
  // Operations
  if (path === "/campaigns-log") return "Campaigns Log";
  if (path === "/performance") return "Performance";
  if (path === "/kpis") return "KPIs";
  
  // Resources
  if (path === "/knowledge") return "Knowledge";
  if (path === "/projects") return "Projects";
  if (path === "/tech-stack") return "Tech Stack";
  
  // Other
  if (path === "/copywriter") return "Copywriter";
  if (path === "/profile") return "Profile";
  if (path === "/security") return "Security";
  if (path === "/notifications") return "Notifications";
  if (path.startsWith("/admin")) return "Admin";
  if (path === "/how-to") return "How To";
  if (path === "/about") return "About";
  
  return null;
};
```

### Safety Check
- Additive change only - no existing routes affected
- Order matters: specific paths before wildcards (e.g., `/ads/search` before `/ads`)

---

## Phase 3: Performance - Add Missing Route Prefetching

### Problem
Sidebar hover prefetching is incomplete - 3 routes lack data prefetch:
- `/kpis` - no `prefetchKPIsData()` call
- `/performance` - no prefetch exists
- `/sprints` - no prefetch exists

### Current State in `AppSidebar.tsx`
The sidebar already calls `prefetchRoute()` for chunk loading, but doesn't prefetch the actual data for these pages like it does for Tasks, Knowledge, etc.

### Implementation

**Step 1:** Add prefetch calls in `src/components/AppSidebar.tsx` for Operations section (lines 206-228):

```typescript
// Operations section - add data prefetching
onMouseEnter={() => {
  prefetchRoute(item.url);
  if (item.url === '/campaigns-log') prefetchCampaignTrackingData();
  if (item.url === '/kpis') prefetchKPIsData();  // ADD THIS
}}
```

**Step 2:** Also add to Core section for Sprints (similar pattern to Tasks).

**Step 3:** Create `prefetchSprintsData` and `prefetchPerformanceData` functions in `src/lib/resourcesPrefetch.ts` if needed, following the existing pattern:

```typescript
export function prefetchSprintsData() {
  queryClient.prefetchQuery({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data } = await supabase.from('sprints').select('*').order('start_date', { ascending: false });
      return data;
    },
    staleTime: 30 * 1000,
  });
}
```

### Safety Check
- Prefetching is fire-and-forget - failures are silent
- No impact on page functionality
- Uses existing `staleTime` patterns

---

## Phase 4: Consistency - Standardize LpPlanner Layout

### Problem
`src/pages/LpPlanner.tsx` uses a custom layout that doesn't match the standard `PageContainer` + `PageHeader` pattern used across 90% of pages.

### Current Code (43 lines total)
```typescript
return (
  <div className="h-[calc(100vh-64px)] flex">
    <div className="w-[280px] flex-shrink-0 border-r border-border">
      <LpMapListCompact ... />
    </div>
    <div className="flex-1 min-w-0">
      <LpCanvas ... />
    </div>
  </div>
);
```

### Proposed Update
Wrap in PageContainer with `size="full"` for edge-to-edge layout while maintaining the split-pane design:

```typescript
import { PageContainer, PageHeader } from "@/components/layout";
import { Target } from "lucide-react";

return (
  <PageContainer size="full" className="!p-0">
    <div className="h-[calc(100vh-120px)] flex">
      {/* Left Panel */}
      <div className="w-[280px] flex-shrink-0 border-r border-border overflow-y-auto">
        <LpMapListCompact ... />
      </div>
      
      {/* Right Panel */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <LpCanvas ... />
      </div>
    </div>
  </PageContainer>
);
```

### Safety Check
- Visual-only change
- Maintains existing split-pane layout
- Height calculation adjusted for header presence

---

## Phase 5: Maintainability - Create PageLoadingSpinner Component

### Problem
Loading spinner pattern is duplicated 20+ times across pages:
```typescript
<div className="flex items-center justify-center min-h-[400px]">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
</div>
```

### Solution
Create a reusable component. Note: `PageLoader.tsx` already exists but uses `min-h-screen` (full page), we need a section-level variant.

### Implementation

**Create** `src/components/layout/PageLoadingSpinner.tsx`:

```typescript
import { cn } from "@/lib/utils";

interface PageLoadingSpinnerProps {
  className?: string;
  message?: string;
  minHeight?: string;
}

export function PageLoadingSpinner({ 
  className,
  message,
  minHeight = "min-h-[400px]"
}: PageLoadingSpinnerProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-md",
      minHeight,
      className
    )}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      {message && (
        <span className="text-body-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
```

**Update** `src/components/layout/index.ts` to export it.

### Usage Pattern
```typescript
// BEFORE
if (authLoading) {
  return (
    <PageContainer>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </PageContainer>
  );
}

// AFTER
import { PageContainer, PageLoadingSpinner } from "@/components/layout";

if (authLoading) {
  return <PageContainer><PageLoadingSpinner /></PageContainer>;
}
```

### Files to Update (gradual migration)
Priority pages for first migration:
- `src/pages/Profile.tsx` (4 instances)
- `src/pages/KPIs.tsx` (1 instance)  
- `src/pages/Sprints.tsx`
- `src/pages/CampaignsLog.tsx`

### Safety Check
- New component, no existing code affected until migrated
- Migration is opt-in per page
- Maintains exact visual output

---

## Implementation Order

| Phase | Risk Level | Files Changed | Estimated Impact |
|-------|------------|---------------|------------------|
| Phase 1: Remove console.logs | Low | ~12 files | Security improvement, no functional change |
| Phase 2: Breadcrumbs | Low | 1 file | UX improvement, additive only |
| Phase 3: Prefetching | Low | 2-3 files | Performance improvement, fire-and-forget |
| Phase 4: LpPlanner layout | Medium | 1 file | Visual consistency, needs visual QA |
| Phase 5: LoadingSpinner | Low | New + gradual | Maintainability, opt-in migration |

---

## Testing Checklist

### Phase 1 (Console Logs)
- [ ] Verify no console output in production build
- [ ] Verify MFA flow still works (setup, verify, logout)
- [ ] Verify error toasts still appear for failed operations

### Phase 2 (Breadcrumbs)
- [ ] Navigate to all sidebar routes - verify breadcrumb appears
- [ ] Check nested routes (/admin/users, /ads/lp) show correct label

### Phase 3 (Prefetching)
- [ ] Open Network tab, hover over KPIs - verify prefetch request fires
- [ ] Navigate to KPIs - verify instant load (no spinner flash)

### Phase 4 (LpPlanner)
- [ ] Verify split-pane layout renders correctly
- [ ] Verify canvas interactions work (drag, zoom, edit)
- [ ] Verify responsive behavior on narrow screens

### Phase 5 (LoadingSpinner)
- [ ] Verify spinner renders identically to current pattern
- [ ] Verify optional message displays correctly
