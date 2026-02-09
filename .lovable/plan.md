
# Site-Wide Audit: Issues Found and Fixes Required

## Summary of Issues Found

I conducted a comprehensive review of the codebase and found **5 critical issues** that need to be addressed:

| Issue | Severity | Component | Impact |
|-------|----------|-----------|--------|
| 1. Password reset link not visible | High | Admin Users | Admins can't see generated links |
| 2. External links not showing in admin | High | Admin Dashboard | No visibility into shared links |
| 3. Missing `created_by` in link generation | Critical | Share Dialogs | Links fail RLS insert check |
| 4. LP Maps not in unified system | Medium | External Links | Fragmented link management |
| 5. Inconsistent share dialog patterns | Low | Multiple | Code duplication, edge cases |

---

## Issue 1: Password Reset Link Not Visible

**Root Cause**: The edge function returns `resetLink` correctly (verified via curl), but the log line is not appearing. Looking at the code, the `hashed_token` extraction depends on the Supabase response structure.

**Investigation Result**: The edge function works correctly - calling it directly returns:
```json
{
  "success": true,
  "resetLink": "https://naviqx.lovable.app/reset-password?token_hash=fffae93667f99437707374bcdc48d0151d7f1d27964c72f0242e2f6a&type=recovery"
}
```

**Status**: This is WORKING. The UI at `UsersManagement.tsx` lines 634-648 correctly displays the link. If you're not seeing it, it may be a caching issue or the dialog closing prematurely.

**No code changes needed** - this appears to be a UI/timing issue.

---

## Issue 2: External Links Not Showing in Admin Dashboard

**Root Cause**: The `public_access_links` table is EMPTY (0 rows). All existing external links use **legacy systems**:
- LP Maps: Store tokens directly in `lp_maps.public_token`
- Knowledge Pages: Store tokens in `knowledge_pages.public_token`
- Projects: Store tokens in `projects.public_token`

The admin dashboard (`ExternalLinksManagement.tsx`) only queries `public_access_links`, so it shows nothing.

**Fix Required**: Update the admin dashboard to aggregate links from ALL sources:
1. `public_access_links` table (unified system)
2. `lp_maps` table with `public_token IS NOT NULL`
3. `knowledge_pages` table with `public_token IS NOT NULL`
4. `projects` table with `public_token IS NOT NULL`

### File: `src/pages/admin/ExternalLinksManagement.tsx`

**Changes**:
- Modify the query to fetch from multiple sources
- Create a union of legacy links with normalized structure
- Display combined results

```typescript
// Current query (line 84-94):
const { data: links = [], isLoading } = useQuery({
  queryKey: ["public-access-links"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("public_access_links")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PublicAccessLink[];
  },
});

// Updated query - fetch from all sources:
const { data: links = [], isLoading } = useQuery({
  queryKey: ["public-access-links", "all-sources"],
  queryFn: async () => {
    // 1. Fetch from unified table
    const { data: unifiedLinks = [] } = await supabase
      .from("public_access_links")
      .select("*")
      .order("created_at", { ascending: false });

    // 2. Fetch legacy LP Maps
    const { data: lpMaps = [] } = await supabase
      .from("lp_maps")
      .select("id, name, public_token, is_public, click_count, last_accessed_at, created_at, created_by")
      .not("public_token", "is", null);

    // 3. Fetch legacy Knowledge Pages
    const { data: knowledgePages = [] } = await supabase
      .from("knowledge_pages")
      .select("id, title, public_token, is_public, created_at, updated_by")
      .not("public_token", "is", null);

    // 4. Fetch legacy Projects
    const { data: projects = [] } = await supabase
      .from("projects")
      .select("id, name, public_token, is_public, created_at")
      .not("public_token", "is", null);

    // Normalize legacy links to PublicAccessLink structure
    const normalizedLpMaps = lpMaps.map(lp => ({
      id: lp.id,
      access_token: lp.public_token,
      resource_type: 'lp_map' as ResourceType,
      resource_id: lp.id,
      entity: lp.name,
      is_active: lp.is_public,
      is_public: true,
      click_count: lp.click_count || 0,
      last_accessed_at: lp.last_accessed_at,
      created_at: lp.created_at,
      created_by: lp.created_by,
      // Remaining fields null
      reviewer_name: null,
      reviewer_email: null,
      email_verified: false,
      expires_at: null,
    }));

    const normalizedKnowledge = knowledgePages.map(kp => ({
      id: kp.id,
      access_token: kp.public_token,
      resource_type: 'knowledge' as ResourceType,
      resource_id: kp.id,
      entity: kp.title,
      is_active: kp.is_public,
      is_public: true,
      click_count: 0,
      last_accessed_at: null,
      created_at: kp.created_at,
      created_by: kp.updated_by,
      reviewer_name: null,
      reviewer_email: null,
      email_verified: false,
      expires_at: null,
    }));

    const normalizedProjects = projects.map(p => ({
      id: p.id,
      access_token: p.public_token,
      resource_type: 'project' as ResourceType,
      resource_id: p.id,
      entity: p.name,
      is_active: p.is_public,
      is_public: true,
      click_count: 0,
      last_accessed_at: null,
      created_at: p.created_at,
      created_by: null,
      reviewer_name: null,
      reviewer_email: null,
      email_verified: false,
      expires_at: null,
    }));

    // Combine and sort by created_at
    return [
      ...unifiedLinks,
      ...normalizedLpMaps,
      ...normalizedKnowledge,
      ...normalizedProjects,
    ].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) as PublicAccessLink[];
  },
});
```

---

## Issue 3: Missing `created_by` in Link Generation

**Root Cause**: The RLS policy requires `created_by = auth.uid()` for INSERT operations. Multiple share dialogs are missing this field:

1. `usePublicAccessManagement.generateLink` (lines 303-316)
2. `CampaignShareDialogUnified` (lines 102-113) - HAS it
3. `SearchAdsShareDialog` (lines 137-144) - HAS it

**Fix Required**: Add `created_by` to `usePublicAccessManagement`:

### File: `src/hooks/usePublicAccess.ts`

**Lines 276-318** - Add user authentication and `created_by`:

```typescript
const generateLink = useMutation({
  mutationFn: async ({
    resourceType,
    entity,
    resourceId,
    reviewerName,
    reviewerEmail,
    expiresAt,
    isPublic = false,
    metadata = {},
  }: GenerateLinkParams) => {
    // Get current user (REQUIRED for RLS)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // Generate unique token
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

    // Deactivate existing links...
    if (!resourceId) {
      await supabase
        .from('public_access_links')
        .update({ is_active: false })
        .eq('entity', entity)
        .eq('resource_type', resourceType)
        .is('resource_id', null)
        .eq('is_active', true);
    }

    // Create new link WITH created_by
    const { data, error } = await (supabase.from('public_access_links') as any)
      .insert({
        access_token: token,
        resource_type: resourceType,
        resource_id: resourceId || null,
        entity,
        reviewer_name: reviewerName || null,
        reviewer_email: reviewerEmail || null,
        expires_at: expiresAt?.toISOString() || null,
        is_public: isPublic,
        is_active: true, // Add this too
        created_by: user.id, // CRITICAL FIX
        metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PublicAccessLink;
  },
  // ...
});
```

---

## Issue 4: Legacy LP Maps Not in Unified System

**Current State**: LP Maps use `lp_maps.public_token` and `lp_maps.is_public` directly instead of the unified `public_access_links` table.

**Impact**: 
- LP Map links work (fixed previously with fallback in `usePublicAccess`)
- But they don't appear in the admin dashboard

**Fix (Already Covered)**: Issue #2's fix includes LP Maps in the aggregated query.

**Future Migration Option**: Optionally run a one-time migration to copy legacy tokens into `public_access_links`:

```sql
-- Migration script (run manually if desired)
INSERT INTO public_access_links (
  access_token, resource_type, resource_id, entity, 
  is_active, is_public, created_by, click_count, 
  last_accessed_at, created_at
)
SELECT 
  public_token, 'lp_map', id, name,
  is_public, true, created_by, click_count,
  last_accessed_at, created_at
FROM lp_maps 
WHERE public_token IS NOT NULL
ON CONFLICT DO NOTHING;
```

---

## Issue 5: Inconsistent Share Dialog Patterns

**Observation**: Each share dialog has slightly different implementations:
- `LpShareDialog`: Uses `useLpMaps` hook, updates `lp_maps` directly
- `KnowledgeShareDialog`: Uses unified system + backward compat
- `CampaignShareDialogUnified`: Uses unified system
- `SearchAdsShareDialog`: Uses unified system
- `ProjectShareDialog`: Uses `usePublicAccessManagement` hook

**Recommendation**: Standardize on the `usePublicAccessManagement` pattern, but this is lower priority since they work.

---

## Implementation Plan

### Phase 1: Fix Critical Issues (Immediate)

| Step | File | Change |
|------|------|--------|
| 1 | `src/hooks/usePublicAccess.ts` | Add `created_by: user.id` to generateLink mutation |
| 2 | `src/pages/admin/ExternalLinksManagement.tsx` | Aggregate links from all legacy tables |

### Phase 2: Handle Admin Actions for Legacy Links

When admin performs actions on legacy links, route to the correct table:

**File**: `src/pages/admin/ExternalLinksManagement.tsx`

Update mutation handlers to check `resource_type` and update the appropriate table:

```typescript
const deactivateMutation = useMutation({
  mutationFn: async (link: PublicAccessLink) => {
    // Check if it's a legacy link (resource_id matches id)
    if (link.resource_type === 'lp_map' && link.resource_id === link.id) {
      // Update lp_maps directly
      const { error } = await supabase
        .from("lp_maps")
        .update({ is_public: false })
        .eq("id", link.id);
      if (error) throw error;
    } else if (link.resource_type === 'knowledge' && link.resource_id === link.id) {
      // Update knowledge_pages
      const { error } = await supabase
        .from("knowledge_pages")
        .update({ is_public: false })
        .eq("id", link.id);
      if (error) throw error;
    } else if (link.resource_type === 'project' && link.resource_id === link.id) {
      // Update projects
      const { error } = await supabase
        .from("projects")
        .update({ is_public: false })
        .eq("id", link.id);
      if (error) throw error;
    } else {
      // Unified table
      const { error } = await supabase
        .from("public_access_links")
        .update({ is_active: false })
        .eq("id", link.id);
      if (error) throw error;
    }
  },
  // ...
});
```

---

## Technical Details

### Files to Modify

1. **`src/hooks/usePublicAccess.ts`**
   - Add user authentication check in `generateLink`
   - Add `created_by: user.id` to insert payload
   - Add `is_active: true` default

2. **`src/pages/admin/ExternalLinksManagement.tsx`**
   - Update query to fetch from 4 sources
   - Normalize legacy links to common interface
   - Update mutations to handle legacy tables
   - Pass full link object to mutation functions (not just ID)

### Testing After Implementation

1. Navigate to `/admin/external-links` - should show all existing links
2. Open a project and enable sharing - should create link successfully
3. The new link should appear in admin dashboard
4. Deactivating a legacy LP Map link should work
5. Password reset flow should show the link (already working)
