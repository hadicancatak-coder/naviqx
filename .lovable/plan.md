

# Cleanup: Minor Refinements for Production Readiness

Based on my audit, the system is **solid and operational**. There's only one minor code fix needed and one maintenance cleanup to perform.

---

## Current Status

| Area | Status | Notes |
|------|--------|-------|
| External links aggregation | Fixed | Legacy tables (lp_maps, knowledge_pages, projects) now visible in admin |
| RLS `created_by` fix | Fixed | Links now save correctly |
| LP Map fallback | Fixed | Legacy tokens work via /r/:token |
| MFA cleanup | Working | "Clean Now" button exists, auto-cleanup on scans |
| Permissive RLS policies | Intentional | All 17 are for audit/logging tables that require system-level inserts |

---

## Single Code Fix Required

### Issue: Admin Dashboard Copy Link Uses Legacy URLs

**File**: `src/pages/admin/ExternalLinksManagement.tsx`

**Current code (lines 348-359)**:
```typescript
const copyToClipboard = (link: PublicAccessLink) => {
  const routes: Record<ResourceType, string> = {
    campaign: "/review",
    knowledge: "/knowledge/public",
    project: "/projects/public",
    lp_map: "/lp/public",
    search_ads: "/ads/search/review",
  };
  const url = `${getProductionUrl()}${routes[link.resource_type]}/${link.access_token}`;
  navigator.clipboard.writeText(url);
  toast.success("Link copied to clipboard");
};
```

**Problem**: Uses old resource-specific routes instead of the universal `/r/:token` pattern.

**Fix**:
```typescript
const copyToClipboard = (link: PublicAccessLink) => {
  // Use universal token URL pattern for all resource types
  const url = `${getProductionUrl()}/r/${link.access_token}`;
  navigator.clipboard.writeText(url);
  toast.success("Link copied to clipboard");
};
```

This simplifies the code and ensures all copied links use the universal resolver that's already in place.

---

## Optional Maintenance: Clean Expired MFA Sessions

There are **6 expired MFA sessions** in the database that should be cleaned up:

| User ID | Expired At |
|---------|-----------|
| 4b9cca79-... | Feb 6, 2026 |
| 4b9cca79-... | Feb 7, 2026 |
| 6496321c-... | Feb 5-7, 2026 (4 sessions) |

**Two ways to clean these**:

1. **Admin Dashboard**: Navigate to `/admin/security` and click "Clean Now" on the expired sessions finding
2. **Direct cleanup**: I can invoke the edge function to run a security scan which auto-cleans expired sessions

---

## Summary

The system is production-ready. After this one-line URL fix, you'll have:

1. Unified external link management with legacy support
2. Proper RLS compliance for all link creation
3. Universal `/r/:token` URLs everywhere
4. Working security dashboard with cleanup capabilities

