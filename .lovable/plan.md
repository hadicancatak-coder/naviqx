
# Campaign Log Redesign - Fast, Simple, Reliable

## Executive Summary

The current Campaign Log is over-engineered with complex drag-and-drop, two-table architecture, and fragile external links. This redesign focuses on **speed**, **simplicity**, and **reliability**.

---

## Current Pain Points

| Issue | Root Cause |
|-------|------------|
| Import doesn't work properly | Creates campaigns but entity tracking is unreliable |
| Adding campaigns is slow | Multi-step: Create campaign → Drag to entity → Set status → Add version |
| Version management is clunky | Must click into detail dialog, add version, upload image separately |
| External links are fragile | Complex token management, email verification confusion |
| Too many UI states | Grid vs List, drag zones, collapsible panels, entity selectors |
| 454-line page component | God component doing everything |

---

## New Design Philosophy

```text
┌─────────────────────────────────────────────────────────────────────┐
│  FROM: Campaign Library + Drag-and-Drop + Entity Tables            │
│  TO: Single Unified Table with Inline Editing + Quick Actions      │
└─────────────────────────────────────────────────────────────────────┘
```

**Core Principles:**
1. **One table, not multiple views** - All campaigns in one filterable table
2. **Inline editing** - Edit directly in rows, not dialogs
3. **Bulk-first** - Select multiple → Apply action → Done
4. **External links just work** - One-click share, no email verification requirement

---

## Part 1: Unified Campaign Table

### New Table Structure

| Column | Type | Editable |
|--------|------|----------|
| ☐ (checkbox) | Selection | - |
| Campaign Name | Text | Inline |
| Landing Page | URL | Inline |
| Entities | Multi-select badges | Inline popover |
| Status | Badge dropdown | Inline |
| Versions | Count + thumbnail | Click to expand |
| Actions | Quick buttons | - |

### Key Features

**1. Inline Entity Assignment**
- Click entity badges → Popover with all entities as toggleable pills
- Toggle ON/OFF instantly, no drag-drop
- Status per entity shown in badge tooltip

**2. Inline Version Preview**
- Hover on "Versions" column → Shows latest version thumbnail
- Click → Expands inline row to show version gallery
- "Add Version" button directly in expanded row

**3. Quick Actions Column**
- 📋 Copy LP link
- 🔗 Open LP
- ➕ Add Version
- 🗑️ Delete

---

## Part 2: Bulk Actions Bar (Bottom Fixed)

### Available Bulk Actions

| Action | Description |
|--------|-------------|
| **Assign to Entities** | Multi-select popover with entity pills + status selector |
| **Change Status** | Update status for all selected campaigns across all entities |
| **Add Version** | Opens modal to upload one version image that applies to ALL selected |
| **Export CSV** | Download selected campaigns with all metadata |
| **Delete** | Remove selected campaigns (with confirmation) |

### Bulk Assign Flow

```text
[Select 5 campaigns] → [Click "Assign"] → [Popover shows:]
┌─────────────────────────────────────────────────┐
│ Select Entities:                                │
│ [Jordan ✓] [Kuwait] [UAE ✓] [Global ✓]         │
│                                                 │
│ Status: [Draft ▾]                               │
│                                                 │
│ [Apply to 5 campaigns]                          │
└─────────────────────────────────────────────────┘
```

---

## Part 3: Simplified Import

### New Import Flow

1. Upload CSV → Preview in table
2. **Auto-detect entities** from column (required in CSV)
3. **Show exactly what will happen:**
   - ✅ 12 new campaigns will be created
   - ♻️ 3 campaigns will be updated (matched by name)
   - ✅ All will be assigned to entities with "Draft" status
4. **One-click import** - Creates campaigns + entity tracking + versions all in one transaction

### Database Transaction (Edge Function)

Instead of multiple client-side mutations, use a single edge function:

```typescript
// New edge function: campaign-bulk-import
const result = await supabase.functions.invoke('campaign-bulk-import', {
  body: { campaigns: parsedRows }
});
// Returns: { created: 12, updated: 3, errors: [] }
```

This ensures atomicity - either all succeed or all fail.

---

## Part 4: External Links That Work

### Current Problems
- Token management is complex
- Email verification is confusing
- Links sometimes don't work (no campaigns visible)

### New Approach

**1. Simplified Share Flow**
- Remove email verification requirement for viewing (only for commenting)
- One toggle: "Public" ON/OFF
- Link shows all campaigns for that entity immediately

**2. New Share Dialog UI**

```text
┌─────────────────────────────────────────────────┐
│ Share Campaign Log                              │
├─────────────────────────────────────────────────┤
│ Entity: Jordan                                  │
│                                                 │
│ [🔘 OFF] Public Link                            │
│                                                 │
│ When enabled, anyone with the link can:        │
│ • View all campaigns and versions              │
│ • Leave feedback (with @cfi.trade email)       │
│                                                 │
│ ─────────────────────────────────────────────  │
│ [When enabled shows:]                          │
│                                                 │
│ 🔗 https://naviqx.lovable.app/review/abc123    │
│ [Copy Link] [Preview] [QR Code]                │
│                                                 │
│ Stats: 47 views • Last accessed 2 hours ago    │
└─────────────────────────────────────────────────┘
```

**3. Fix External Review Page**
- Remove inline identification bar - move to header
- Show campaigns immediately (read-only until identified)
- Identification only blocks commenting, not viewing

---

## Part 5: Database Optimizations

### New RPC Function: bulk_import_campaigns

```sql
CREATE OR REPLACE FUNCTION bulk_import_campaigns(
  p_campaigns JSONB[]
) RETURNS TABLE (
  campaign_id UUID,
  action TEXT, -- 'created' or 'updated'
  entity TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  campaign JSONB;
  v_campaign_id UUID;
  v_action TEXT;
BEGIN
  FOREACH campaign IN ARRAY p_campaigns LOOP
    -- Upsert campaign
    INSERT INTO utm_campaigns (name, landing_page, campaign_type, description)
    VALUES (
      campaign->>'name',
      campaign->>'landing_page',
      campaign->>'campaign_type',
      campaign->>'description'
    )
    ON CONFLICT (name) DO UPDATE SET
      landing_page = EXCLUDED.landing_page,
      campaign_type = EXCLUDED.campaign_type,
      description = EXCLUDED.description
    RETURNING id INTO v_campaign_id;
    
    v_action := CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END;
    
    -- Create entity tracking
    IF campaign->>'entity' IS NOT NULL THEN
      INSERT INTO campaign_entity_tracking (campaign_id, entity, status)
      VALUES (v_campaign_id, campaign->>'entity', COALESCE(campaign->>'status', 'Draft'))
      ON CONFLICT (campaign_id, entity) DO NOTHING;
    END IF;
    
    -- Create version if provided
    IF campaign->>'version_notes' IS NOT NULL THEN
      INSERT INTO utm_campaign_versions (utm_campaign_id, version_number, version_notes, asset_link)
      VALUES (
        v_campaign_id,
        COALESCE((campaign->>'version_number')::int, 1),
        campaign->>'version_notes',
        campaign->>'asset_link'
      );
    END IF;
    
    RETURN QUERY SELECT v_campaign_id, v_action, campaign->>'entity';
  END LOOP;
END;
$$;
```

### Add Missing Unique Constraint

```sql
-- Enable upsert on campaign name
CREATE UNIQUE INDEX IF NOT EXISTS idx_utm_campaigns_name_unique 
ON utm_campaigns(name) WHERE is_active = true;
```

---

## Part 6: Component Architecture

### New File Structure

```text
src/pages/CampaignsLog.tsx (< 200 lines)
├── src/components/campaigns/CampaignTable.tsx - Main table with react-window
├── src/components/campaigns/CampaignRow.tsx - Single row with inline edit
├── src/components/campaigns/EntityAssignPopover.tsx - Multi-entity selector
├── src/components/campaigns/VersionInlinePanel.tsx - Expandable version gallery
├── src/components/campaigns/CampaignBulkBar.tsx - Bottom actions bar
├── src/components/campaigns/CampaignImportDialog.tsx - Simplified import
├── src/components/campaigns/CampaignShareDialog.tsx - Simplified share
└── src/hooks/useCampaignBulkActions.ts - Bulk mutation logic
```

### CampaignTable Component

Uses `react-window` for virtualization:
- Handles 500+ campaigns without lag
- Expandable rows for version preview
- Inline editing with optimistic updates

---

## Part 7: Files to Create

| File | Purpose |
|------|---------|
| `src/components/campaigns/CampaignTable.tsx` | Virtualized table with inline editing |
| `src/components/campaigns/CampaignRow.tsx` | Single row with expand/collapse |
| `src/components/campaigns/EntityAssignPopover.tsx` | Multi-entity toggle popover |
| `src/components/campaigns/VersionInlinePanel.tsx` | Inline version gallery |
| `src/hooks/useCampaignBulkActions.ts` | Batch operations hook |
| `supabase/functions/campaign-bulk-import/index.ts` | Edge function for atomic import |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CampaignsLog.tsx` | Complete rewrite - simpler, single table |
| `src/components/campaigns/CampaignBulkImportDialog.tsx` | Use edge function instead of client mutations |
| `src/components/campaigns/CampaignShareDialog.tsx` | Simplify UI, add QR code |
| `src/pages/CampaignReview.tsx` | Remove identification requirement for viewing |
| Database migration | Add unique constraint + bulk import function |

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Add campaign + assign to 3 entities | 4 clicks + drag | 2 clicks |
| Import 50 campaigns | ~30s + errors | ~2s, atomic |
| Change status for 10 campaigns | 10 separate clicks | 2 clicks |
| Page load (100 campaigns) | ~1.5s | ~0.5s |
| Lines of code (CampaignsLog) | 454 | ~150 |

---

## Implementation Order

1. **Database first** - Add constraints + bulk import RPC
2. **Edge function** - Campaign bulk import
3. **Core table** - CampaignTable + CampaignRow
4. **Bulk actions** - useCampaignBulkActions hook
5. **Entity popover** - Inline assignment
6. **Import dialog** - Use edge function
7. **External links** - Simplify review page
8. **Page rewrite** - New CampaignsLog.tsx
