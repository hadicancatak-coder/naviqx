

# Remaining Work to Reach 9/10

## Current Honest Score: 7.5/10

We completed Steps 1-4 partially, but significant work remains:

---

## What's Still Broken

| Issue | Count | Impact |
|-------|-------|--------|
| Console calls in production | 20+ files | -0.5 points |
| Permissive RLS policies | 19 policies | -0.5 points |
| Security Definer Views | 2 views | -0.25 points |
| Functions missing search_path | 2 functions | -0.25 points |
| Materialized View in API | 1 view | -0.1 points |

---

## Step 1: Complete Console Cleanup (Remaining 20+ Files)

### Hooks (6 files)
| File | Line | Fix |
|------|------|-----|
| `useAdEditorState.ts` | 24 | `console.error` → `logger.error` |
| `useLpOrderPreferences.ts` | 30 | `console.error` → `logger.error` |
| `useSystemEntities.ts` | 238 | `console.error` → `logger.error` |
| `useUtmCampaigns.ts` | 265 | `console.warn` → `logger.warn` |

### Components (10 files)
| File | Line | Fix |
|------|------|-----|
| `EntityCommentsDialog.tsx` | 137 | `console.error` → `logger.error` |
| `TaskAnalyticsDashboard.tsx` | 160 | `console.error` → `logger.error` |
| `MoveAdDialog.tsx` | 103 | `console.error` → `logger.error` |
| `AdEditorPanel.tsx` | 163 | `console.error` → `logger.error` |
| `TaskChecklistSection.tsx` | 42 | `console.error` → `logger.error` |
| `GoogleSheetPicker.tsx` | 23, 31, 39 | `console.log/error` → `logger.debug/error` |
| `BulkSiteUploadDialog.tsx` | 135 | `console.error` → `logger.error` |
| `NeedsAttention.tsx` | 30 | `console.error` → `logger.error` |
| `OverdueTasks.tsx` | 68 | `console.error` → `logger.error` |
| `ProjectDialog.tsx` | 93 | `console.error` → `logger.error` |

### Pages (1 file)
| File | Lines | Fix |
|------|-------|-----|
| `CampaignReview.tsx` | 175, 183, 197 | `console.error/log` → `logger.error/debug` |

### Libraries (2 files)
| File | Line | Fix |
|------|------|-----|
| `reportHelpers.ts` | 80 | `console.error` → `logger.error` |
| `UrlEnrichmentService.ts` | 98 | `console.error` → `logger.error` |

---

## Step 2: Database Security Fixes

### 2A: Fix Security Definer Views (2 ERROR issues)
The linter detected 2 views with SECURITY DEFINER that bypass RLS. This is the highest priority database fix.

**Action**: Either:
- Convert to SECURITY INVOKER if RLS should apply
- Or document as intentional (e.g., `task_comment_counts` needs aggregation across all tasks)

### 2B: Fix Functions Missing search_path (2 WARN issues)
Two functions lack `SET search_path = public`, creating schema hijacking risk.

**Action**: Add `SET search_path = public` to the function definitions via migration.

### 2C: Audit 19 Permissive RLS Policies (19 WARN issues)
Policies using `USING(true)` or `WITH CHECK(true)` for write operations.

**Classification needed:**
1. **Intentional (audit/log tables)**: Document why they're intentional
   - `task_activity_log`, `task_change_logs`, `activity_logs` - logging tables where any authenticated user should be able to insert their own logs
   - `mfa_sessions` - users create their own sessions
   
2. **Needs fixing (security risk)**:
   - `tasks` UPDATE/DELETE - should require ownership or assignment
   - `external_reviewer_sessions` - should validate token in policy
   - Any table with user data that shouldn't be globally writable

---

## Implementation Order

| Step | Effort | Impact |
|------|--------|--------|
| 1. Console cleanup (20 files) | 45 min | +0.5 |
| 2A. Security Definer Views | 15 min | +0.25 |
| 2B. Functions search_path | 10 min | +0.25 |
| 2C. RLS policy audit | 1-2 hours | +0.5 |

**Total estimated effort: ~3 hours to reach 9/10**

---

## Expected Final Score

| Metric | Before | After |
|--------|--------|-------|
| Console calls | 20+ | 0 |
| Security Definer Views | 2 errors | 0 errors |
| Missing search_path | 2 warns | 0 warns |
| Permissive RLS | 19 warns | 0-3 (documented) |
| **Health Score** | **7.5/10** | **9/10** |

---

## Technical Details

### Console Replacement Pattern
```typescript
// Before
console.error("Failed to fetch:", error);

// After  
import { logger } from '@/lib/logger';
logger.error("Failed to fetch:", error);
```

### Security Definer View Fix
```sql
-- Option A: Convert to INVOKER (RLS applies)
ALTER VIEW view_name SET (security_invoker = true);

-- Option B: Keep DEFINER but document why
-- Add comment explaining aggregation/system requirement
```

### Function search_path Fix
```sql
CREATE OR REPLACE FUNCTION function_name()
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Add this line
AS $$
...
$$;
```

