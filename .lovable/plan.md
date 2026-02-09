

# Fix External Review Links for Brief Planner (LP Maps)

## Problem Identified

When you visit `/r/6f4b55d4-bae7-42fa-a6e9-6f1a0b1e33ed`, the page shows "Access Denied - Invalid or expired access link" even though the token exists in the database with `is_public: true`.

**Root Cause**: There are two lookup systems that don't align:

| Component | Where it looks | Result |
|-----------|---------------|--------|
| `useTokenResolver` | `public_access_links` first, then `lp_maps` (fallback) | Finds it in `lp_maps` |
| `usePublicAccess` | **ONLY** `public_access_links` | NOT found - shows error |

The `useTokenResolver` correctly finds the token in the `lp_maps` table, but then `usePublicAccess` (used by `ExternalReviewPage`) only searches `public_access_links` and fails.

## Solution

Modify `usePublicAccess` to include the same fallback logic for legacy LP Map tokens stored in the `lp_maps` table.

### File Changes

**1. `src/hooks/usePublicAccess.ts`**

Update the access data query to include fallback for `lp_map` tokens:

```text
Current (lines 77-100):
- Only queries public_access_links table
- Returns "Invalid or expired access link" if not found

Updated:
- First check public_access_links table
- If not found AND resourceType is 'lp_map', fallback to lp_maps table
- Construct a compatible PublicAccessLink object from lp_maps data
```

**Key code change:**

```typescript
// In useQuery queryFn for public-access
const { data, error } = await supabase
  .from('public_access_links')
  .select('*')
  .eq('access_token', token)
  .eq('resource_type', resourceType)
  .eq('is_active', true)
  .maybeSingle();

if (error) throw error;

// EXISTING: If found in public_access_links, use it
if (data) {
  // ... existing logic
  return data as PublicAccessLink;
}

// NEW: Fallback for legacy LP Map tokens stored in lp_maps table
if (resourceType === 'lp_map') {
  const { data: lpMap, error: lpMapError } = await supabase
    .from('lp_maps')
    .select('id, name, is_public, entity_id, click_count, last_accessed_at, created_at')
    .eq('public_token', token)
    .eq('is_public', true)
    .maybeSingle();

  if (lpMapError) throw lpMapError;
  
  if (lpMap) {
    // Construct a compatible PublicAccessLink object
    return {
      id: lpMap.id,
      access_token: token,
      resource_type: 'lp_map',
      resource_id: lpMap.id,
      entity: null, // Legacy tokens may not have entity
      is_active: lpMap.is_public,
      is_public: true,
      expires_at: null,
      created_by: null,
      created_at: lpMap.created_at,
      click_count: lpMap.click_count || 0,
      last_accessed_at: lpMap.last_accessed_at,
      metadata: {},
      reviewer_name: null,
      reviewer_email: null,
      email_verified: false,
    } as PublicAccessLink;
  }
}

throw new Error('Invalid or expired access link');
```

### Additional Improvements

**2. Update click tracking for legacy tokens**

The current click tracking in `usePublicAccess` uses RPC `increment_access_link_clicks` which only works for `public_access_links` table. For legacy LP Map tokens, we should also update the `lp_maps.click_count`:

```typescript
// In the useEffect for click tracking
if (accessData && !hasTrackedClick) {
  setHasTrackedClick(true);
  void (async () => {
    try {
      // For legacy LP Map tokens, update lp_maps directly
      if (accessData.resource_type === 'lp_map' && accessData.resource_id) {
        await supabase.from('lp_maps').update({
          click_count: (accessData.click_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        }).eq('id', accessData.resource_id);
      } else {
        // Standard click tracking
        await supabase.rpc('increment_access_link_clicks', { p_token: token });
      }
    } catch {
      // Silent fail - click tracking is best-effort
    }
  })();
}
```

## Why This Fixes Your Issue

| Step | Before | After |
|------|--------|-------|
| Token lookup | Found in `lp_maps` by `useTokenResolver` | Same |
| Access verification | `usePublicAccess` fails - only checks `public_access_links` | `usePublicAccess` also checks `lp_maps` as fallback |
| Page render | Shows "Access Denied" | Loads LP Map content |

## About Re-enabling Sharing

When you disable and re-enable sharing in the LP Share Dialog, the current code only toggles `is_public`. The token stays the same - which is actually fine. The issue was purely that `usePublicAccess` didn't know how to find tokens in the `lp_maps` table.

After this fix, your existing token `6f4b55d4-bae7-42fa-a6e9-6f1a0b1e33ed` will work immediately.

