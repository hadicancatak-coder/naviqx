

# Bulk Actions + Display & App Campaign Types for Search Planner

## Summary

This plan adds three major capabilities to the Search Planner: **campaign type differentiation** (Search, Display, App), **bulk campaign actions**, and proper **routing and navigation** for all campaign types.

| Change | Location | Impact |
|--------|----------|--------|
| Database: Add `campaign_type` column | `search_campaigns` table | Low |
| Database: Fix `ads` FK to CASCADE on ad_group delete | `ads` table | Critical |
| Campaign type selector in create dialog | `CreateCampaignDialog.tsx` | Medium |
| Campaign type filter pills in structure panel | `SearchPlannerStructurePanel.tsx` | Medium |
| Type badges on campaign rows | `SearchPlannerStructurePanel.tsx` | Low |
| Selection mode + checkboxes on campaigns | `SearchPlannerStructurePanel.tsx` | High |
| Floating bulk actions bar (new component) | `SearchPlannerBulkBar.tsx` | Medium |
| Display Planner route + sidebar entry | `App.tsx`, `AppSidebar.tsx` | Medium |
| Duplicate dialog: carry `campaign_type` | `DuplicateCampaignDialog.tsx` | Low |

---

## Critical Detail: Cascade Delete Fix

Currently, `ads.ad_group_id` uses `ON DELETE SET NULL`. When we bulk-delete campaigns, the cascade chain is:

```text
search_campaigns --> ad_groups (CASCADE) --> ads (SET NULL = orphaned!)
```

This means bulk-deleting campaigns will **orphan ads** instead of removing them. We must fix this:

```sql
ALTER TABLE ads DROP CONSTRAINT ads_ad_group_id_fkey;
ALTER TABLE ads ADD CONSTRAINT ads_ad_group_id_fkey 
  FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE;
```

With this fix, deleting a campaign cascades through ad_groups and then to ads -- no orphans.

---

## 1. Database Migration

```sql
-- Add campaign_type column
ALTER TABLE search_campaigns
  ADD COLUMN campaign_type text NOT NULL DEFAULT 'search';

-- Fix ads cascade (currently SET NULL, should CASCADE)
ALTER TABLE ads DROP CONSTRAINT ads_ad_group_id_fkey;
ALTER TABLE ads ADD CONSTRAINT ads_ad_group_id_fkey 
  FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE;
```

No new RLS policies needed -- existing policies on `search_campaigns` cover this.

---

## 2. CreateCampaignDialog: Add Campaign Type Selector

**File**: `src/components/ads/CreateCampaignDialog.tsx`

### Changes
- Add `campaignType` state, default from new prop `defaultCampaignType` (or `'search'`)
- Add a **Campaign Type** select field with three options and descriptions:
  - **Search** -- Text ads on search results pages
  - **Display** -- Visual banner ads across display network  
  - **App** -- App install and engagement campaigns
- Save `campaign_type` on insert
- Update props interface to accept `defaultCampaignType?: 'search' | 'display' | 'app'`

---

## 3. SearchPlannerStructurePanel: Type Filter + Selection Mode

**File**: `src/components/search-planner/SearchPlannerStructurePanel.tsx`

### 3a. Campaign Type Filter Pills
Below the search bar, add a row of filter pills:

- `All` | `Search` | `Display` | `App`
- State: `campaignTypeFilter` (default: `'all'`)
- Filter `filteredCampaigns` by `campaign_type` when not `'all'`
- "New Campaign" button pre-fills the type from active filter
- Counts shown on each pill (e.g., "Search (4)")

### 3b. Campaign Type Badges
Each campaign row shows a small badge indicating its type:
- Search: blue badge
- Display: purple badge
- App: green badge

### 3c. Selection Mode
- Add a **checkbox icon button** in the header to toggle `selectionMode`
- When active:
  - Each campaign row gets a `Checkbox` on the left side
  - A "Select All (filtered)" / "Deselect All" toggle at the top
  - Clicking checkbox selects/deselects (does NOT expand/collapse)
  - Campaign row click still expands/collapses (only checkbox toggles selection)
- State: `selectionMode: boolean`, `selectedCampaignIds: Set<string>`
- When selection mode is off, clear all selections
- Pass selected IDs + callbacks down to the bulk bar

### 3d. Props Update
Add new prop to `SearchPlannerStructurePanelProps`:
```typescript
defaultCampaignType?: 'search' | 'display' | 'app';
```
This allows the parent page to tell the structure panel what type to default to.

---

## 4. SearchPlannerBulkBar: Floating Bulk Actions

**New file**: `src/components/search-planner/SearchPlannerBulkBar.tsx`

Follows the established `CampaignBulkActionsBar` pattern (floating `Card` at bottom center).

### Actions

| Action | Behavior |
|--------|----------|
| **Clear** | Deselects all, exits selection mode |
| **Delete** | AlertDialog confirmation showing total ad groups + ads count that will be removed. Deletes from `search_campaigns` (cascade handles the rest). Invalidates `search-campaigns-hierarchy`, `ad-groups-hierarchy`, `ads-hierarchy` |
| **Duplicate** | Duplicates all selected campaigns with their ad groups and ads. Shows progress bar. Uses same logic as existing `DuplicateCampaignDialog` but batched |
| **Export** | Exports selected campaigns to JSON with full hierarchy (campaigns > ad groups > ads). Downloads as file |
| **Change Status** | Dropdown: Active / Paused / Draft. Bulk updates `status` column on `search_campaigns` |

### Props
```typescript
interface SearchPlannerBulkBarProps {
  selectedCampaignIds: Set<string>;
  campaigns: CampaignData[];
  adGroups: AdGroupData[];
  ads: AdData[];
  onClearSelection: () => void;
  onRefresh: () => void;
}
```

The component internally computes counts (ad groups, ads) for the selected campaigns to show in confirmations.

---

## 5. DuplicateCampaignDialog: Carry campaign_type

**File**: `src/components/search/DuplicateCampaignDialog.tsx`

Currently the duplicate insert does not include `campaign_type` in the spread. Since we added it as a column, the existing `...rest` spread in the duplicate logic will carry it automatically. But the `Campaign` interface in this file needs updating to include `campaign_type?: string`.

---

## 6. Routes: Add Display Planner

**File**: `src/App.tsx`
```tsx
<Route path="/ads/display" element={<SearchPlanner adType="display" key="display" />} />
```

**File**: `src/components/AppSidebar.tsx`
Add a "Display Planner" entry under ads items:
```tsx
{ title: "Display Planner", url: "/ads/display", icon: Image },
```

**File**: `src/components/layout/TopHeader.tsx`
Add breadcrumb title mapping:
```tsx
if (path === "/ads/display") return "Display Planner";
```

App campaigns share the same planner UI with `adType="display"` for now (Display and App ads use the same format). The `campaign_type` column distinguishes them within the same planner instance.

---

## 7. Structure Panel Query: Filter by campaign_type

Currently the structure panel fetches ALL campaigns for the entity. With the new campaign type filter, the query remains the same (fetch all for entity), and filtering happens client-side using `campaignTypeFilter`. This keeps the code simple and avoids extra network calls when switching filters.

When the planner is mounted via `/ads/display`, the `defaultCampaignType` prop defaults the filter to `'display'` (but user can switch to see all).

---

## Implementation Order

1. Database migration (add `campaign_type`, fix ads FK cascade)
2. Update `CreateCampaignDialog.tsx` (campaign type selector + prop)
3. Create `SearchPlannerBulkBar.tsx` (floating bulk actions)
4. Update `SearchPlannerStructurePanel.tsx` (filter pills, type badges, selection mode, bulk bar)
5. Update `DuplicateCampaignDialog.tsx` (campaign_type in interface)
6. Add routes: `App.tsx`, `AppSidebar.tsx`, `TopHeader.tsx`
7. Export from `index.ts`

