
# Fix Campaign Log External Review Issues

## Problem Analysis

After thorough investigation, I found that the new external review components ARE implemented and exist in the codebase. However, there are several issues preventing them from working correctly:

### Issue 1: Duplicate Active Tokens
The database currently has **4 active tokens for Jordan** - each time the share link is toggled, a NEW token is created without deactivating the old ones. This causes:
- Query confusion about which token to display
- Link appearing blank because the query returns the wrong (or first) record

### Issue 2: Share Dialog State Refresh
After creating a new share link, the `fetchEntityShareInfo` query may not be returning the newly created token because:
- Multiple records exist for the same entity
- No ordering ensures the latest record is returned

### Issue 3: Token Rotation Logic Missing
When a user deactivates and reactivates a link, the system should:
- Either update the EXISTING record's `is_active` flag
- OR deactivate ALL old tokens before creating a new one

---

## Technical Implementation

### Step 1: Fix Token Creation/Activation Logic

Update `CampaignShareDialog.tsx` to:
1. First check if a record already exists for the entity
2. If exists: UPDATE the existing record (set `is_active = true`, regenerate token if needed)
3. If not exists: INSERT a new record
4. Deactivate any other active tokens for the same entity

### Step 2: Fix Query to Get Latest Token

Update `fetchEntityShareInfo` in `CampaignsLog.tsx` to:
1. Order by `created_at DESC` to get the most recent record
2. Filter by `is_active = true`
3. Limit to 1 result

### Step 3: Database Cleanup

Create a migration to:
1. Deactivate duplicate tokens (keep only the most recent per entity)
2. Add a unique partial index to prevent future duplicates

### Step 4: Ensure External Page Works

Verify that:
1. The external review page (`/campaigns-log/review/:token`) renders the new `ExternalCampaignGrid`
2. Public access bypass is working correctly
3. Data loads properly for anonymous users

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/campaigns/CampaignShareDialog.tsx` | Fix toggle logic to upsert instead of always insert |
| `src/pages/CampaignsLog.tsx` | Add ordering to fetchEntityShareInfo query |
| `supabase/migrations/` | Cleanup duplicate tokens, add unique constraint |

---

## Expected Outcome

After this fix:
1. Share link toggle will work reliably (activate/deactivate)
2. The link will appear immediately after activation
3. External review page will display the new visual board layout
4. Entity feedback submission will work (already fixed in DB)
5. No duplicate tokens cluttering the database
