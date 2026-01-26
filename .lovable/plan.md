

# Fix Campaign Log Sharing - RLS Policy & Architecture

## Problem Summary

The "Share" toggle in Campaign Log is failing with RLS policy violations because:

1. **Missing RLS policies**: The `campaign_external_access` table lacks UPDATE policies for authenticated users
2. **Wrong pattern**: Using `campaign_external_access` instead of entity-level sharing columns (like Projects uses `projects.is_public`)
3. **Missing `created_by`**: INSERT policy requires `created_by = auth.uid()` but the code doesn't set it

---

## Root Cause Analysis

| Issue | Current State | Required State |
|-------|---------------|----------------|
| RLS UPDATE for authenticated | Missing | Allow authenticated users to update their own records |
| RLS INSERT for authenticated | Checks `created_by = auth.uid()` | Code must set `created_by` on insert |
| Architecture pattern | Uses `campaign_external_access` per entity | Should match Projects pattern for simplicity |

---

## Solution: Add Missing RLS Policies

### Database Migration

Add policies to allow authenticated users to manage their external access records:

```sql
-- Allow authenticated users to update their own external access records
CREATE POLICY "Authenticated users can update own records"
ON public.campaign_external_access
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to select their own records
CREATE POLICY "Authenticated users can select own records"
ON public.campaign_external_access
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR is_active = true);

-- Allow authenticated users to delete their own records
CREATE POLICY "Authenticated users can delete own records"
ON public.campaign_external_access
FOR DELETE
TO authenticated
USING (created_by = auth.uid());
```

---

## Code Fix: Set `created_by` on Insert

Update `CampaignShareDialog.tsx` to include `created_by` when inserting:

```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Insert new record WITH created_by
const { error } = await supabase
  .from("campaign_external_access")
  .insert({
    entity,
    access_token: newToken,
    is_active: true,
    reviewer_email: "public@cfi.trade",
    reviewer_name: "Public Access",
    created_by: user?.id,  // <-- ADD THIS
  });
```

---

## Files to Modify

| File | Changes |
|------|---------|
| New Supabase Migration | Add RLS policies for authenticated users on `campaign_external_access` |
| `src/components/campaigns/CampaignShareDialog.tsx` | Add `created_by: user.id` to INSERT operation |

---

## Testing Checklist

1. Toggle share ON creates a new record successfully
2. Toggle share OFF updates the record to `is_active: false`
3. Share URL is generated and copyable
4. External reviewers can access the link
5. Click count is tracked properly

