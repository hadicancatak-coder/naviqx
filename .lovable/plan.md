

# External + Internal Comments Integration Analysis & Fix Plan

## Current State Summary

### What's Already Working

| Feature | Status | How It Works |
|---------|--------|--------------|
| Version comments sync | ✅ Works | `useVersionComments` queries both `utm_campaign_version_comments` AND `external_campaign_review_comments` tables |
| Entity comments sync | ✅ Works | `EntityCommentsDialog` fetches both internal entity comments and external entity feedback |
| External badge display | ✅ Works | Both `VersionComments` and `EntityCommentsDialog` show "External" badges |

### What's Not Working / Missing

| Issue | Impact | Location |
|-------|--------|----------|
| **No entity comments button on CampaignsLog** | Users can't see entity-level external feedback from the main campaigns table | `CampaignsLog.tsx` / `CampaignTable.tsx` |
| **External page uses different UI** | External reviewers see `ExternalVersionGallery`, not the new `VersionDetailPanel` | `CampaignReview.tsx` |
| **External page not updated** | Our recent version sub-row improvements aren't reflected on the external review page | External components |

---

## Recommended Fixes

### 1. Add Entity Comments Button to CampaignsLog

**Current:** The internal Campaigns Log (`/campaigns-log`) doesn't show entity-level comments anywhere.

**Solution:** Add an "Entity Feedback" button in the filter bar that opens `EntityCommentsDialog` when an entity is selected.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 🔍 Search...       [Entity ▼]    [Share]  [💬 Entity Feedback (5)]  │
└──────────────────────────────────────────────────────────────────────┘
```

**Changes:**
- Import `EntityCommentsDialog` in `CampaignsLog.tsx`
- Add state for dialog open/close
- Add button next to share button (only visible when entity selected)
- Show comment count badge

### 2. Sync External Page UI (Optional Enhancement)

The external page (`CampaignReview.tsx`) uses different components:
- `ExternalVersionGallery` - Grid of version thumbnails + comment form
- `ExternalCampaignDetailPanel` - Campaign details wrapper

These work fine but have a different UX than the internal page. Options:

**Option A: Keep Separate (Recommended)**
- External page is optimized for external reviewers (simpler UI)
- Internal page has admin features (edit, delete, etc.)
- Comments already sync between both

**Option B: Unify Components**
- Create shared version display components
- More maintenance but consistent UX
- Not recommended unless specifically requested

---

## Implementation Plan

### Phase 1: Add Entity Comments Access to CampaignsLog

**File: `src/pages/CampaignsLog.tsx`**

1. Import `EntityCommentsDialog`
2. Add state: `entityCommentsOpen`, `entityCommentCount`
3. Add query to fetch entity comment count when entity filter changes
4. Add button in filter bar (next to share button)
5. Render `EntityCommentsDialog`

**Code additions:**
```typescript
// State
const [entityCommentsOpen, setEntityCommentsOpen] = useState(false);

// In filter bar (only when entity selected and not "all")
{entityFilter && entityFilter !== "all" && (
  <Button variant="outline" onClick={() => setEntityCommentsOpen(true)}>
    <MessageSquare className="h-4 w-4 mr-2" />
    Entity Feedback
  </Button>
)}

// Dialog
<EntityCommentsDialog
  open={entityCommentsOpen}
  onOpenChange={setEntityCommentsOpen}
  entityName={entityFilter}
/>
```

### Phase 2: Add Comment Count Query (Optional Polish)

Add a query to show how many external comments exist for the selected entity:

```typescript
const { data: entityCommentCount = 0 } = useQuery({
  queryKey: ["entity-comment-count", entityFilter],
  queryFn: async () => {
    if (!entityFilter || entityFilter === "all") return 0;
    const { count } = await supabase
      .from("external_campaign_review_comments")
      .select("*", { count: "exact", head: true })
      .eq("entity", entityFilter)
      .eq("comment_type", "entity_feedback");
    return count || 0;
  },
  enabled: !!entityFilter && entityFilter !== "all",
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CampaignsLog.tsx` | Add EntityCommentsDialog import, state, button, and dialog |

---

## Verification Steps

After implementation:

1. **Test Internal → External sync:**
   - Go to `/campaigns-log`
   - Select an entity (e.g., "UAE")
   - Click "Entity Feedback" button
   - Add a comment as internal user
   - Open external review link for same entity
   - Verify comment appears

2. **Test External → Internal sync:**
   - Open external review link
   - Submit entity-level feedback
   - Go back to `/campaigns-log`
   - Select same entity
   - Click "Entity Feedback"
   - Verify external comment appears with "External" badge

3. **Test Version Comments:**
   - Expand a campaign row
   - Expand a version row
   - Verify external comments show with "External" badge
   - Add internal comment
   - Open external review → verify it shows

---

## Technical Notes

### Why Comments Already Sync

The `useVersionComments` hook (lines 27-39) does this:

```typescript
const [internalResult, externalResult] = await Promise.all([
  supabase.from("utm_campaign_version_comments").select("*")...
  supabase.from("external_campaign_review_comments").select("*")...
]);
```

Both tables are queried and merged. External comments get `is_external: true` flag.

### Database Tables Involved

| Table | Purpose | Used By |
|-------|---------|---------|
| `utm_campaign_version_comments` | Internal version comments | Internal users via `VersionComments` |
| `external_campaign_review_comments` | External version + entity comments | External reviewers via `CampaignReview.tsx` |
| `entity_comments` | Internal entity comments | Internal users via `EntityCommentsDialog` |

