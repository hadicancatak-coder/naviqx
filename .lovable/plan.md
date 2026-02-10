

# Show Ad Group Configuration Properly in the Search Planner

## Problem
When you select an ad group, the bidding strategy and match types you chose during creation are only shown as tiny badges in the tree. There is no dedicated place to **view, review, or edit** these settings. The middle panel jumps straight to "Select an Ad to Edit" or the ad editor -- there's no ad group-level planning view.

## Solution
Add an **Ad Group Detail View** that appears in the middle panel when an ad group node is clicked (not expanded). This gives a proper planning space to see and manage all ad group settings before diving into individual ads.

---

## What Changes

### 1. New Component: Ad Group Detail Panel
**File**: `src/components/search-planner/AdGroupDetailPanel.tsx`

A dedicated panel that shows when you click an ad group name in the tree. Contains:

- **Header**: Ad group name with breadcrumb (Entity > Campaign > Ad Group)
- **Bidding Strategy Card**: Shows selected strategy with option to change it
- **Match Type Strategy Card**: Shows selected match types (Exact/Phrase/Broad) with toggles to update
- **Keyword Strategy Section**: The existing `KeywordStrategySection` component embedded here (up to 20 keywords)
- **Ads Summary**: List of ads in this group with quick "Add Ad" button

This is the proper "planning view" for the ad group -- everything in one place.

### 2. Update Structure Panel: Add "click to view" on Ad Group Name
**File**: `src/components/search-planner/SearchPlannerStructurePanel.tsx`

- Clicking the **chevron** still expands/collapses the ad group tree node
- Clicking the **ad group name** calls a new `onAdGroupClick` callback that opens the detail panel in the middle column
- Same pattern already used for campaigns (`onCampaignClick`)

### 3. Update Search Planner Page to Handle Ad Group Selection
**File**: `src/pages/SearchPlanner.tsx`

- Add a new state: `adGroupContext` (holds selected ad group + campaign + entity)
- When `onAdGroupClick` fires, set `adGroupContext` and clear `editorContext`
- Middle panel renders `AdGroupDetailPanel` when an ad group is selected (no ad)
- From the detail panel, clicking "Edit" on bidding/match types saves changes inline
- Clicking "Add Ad" or an ad row transitions to the ad editor as before

### 4. Update SearchHierarchyPanel (legacy panel) similarly
**File**: `src/components/search/SearchHierarchyPanel.tsx`

- Same pattern: ad group name click triggers `onAdGroupClick`

---

## Technical Details

### AdGroupDetailPanel Props
```
- adGroup: { id, name, bidding_strategy, match_types, keywords, campaign_id }
- campaign: { id, name }
- entity: string
- onEditAd: (ad) => void
- onCreateAd: () => void
- onAdGroupUpdated: () => void  // triggers cache invalidation after edits
```

### Inline Editing
- Bidding strategy and match types are editable inline (Select + Checkboxes)
- Changes save directly to `ad_groups` table via Supabase update
- On save, invalidate `ad-groups-hierarchy` query key

### Middle Panel Priority
The middle panel renders based on this priority:
1. `editorContext` set -- show Ad Editor
2. `adGroupContext` set -- show Ad Group Detail Panel
3. Neither -- show empty state ("Select an Ad to Edit")

### Files Modified
| File | Change |
|------|--------|
| `src/components/search-planner/AdGroupDetailPanel.tsx` | New component |
| `src/components/search-planner/SearchPlannerStructurePanel.tsx` | Add `onAdGroupClick` prop, split click handler |
| `src/components/search/SearchHierarchyPanel.tsx` | Add `onAdGroupClick` prop |
| `src/pages/SearchPlanner.tsx` | Add ad group context state, render detail panel |
| `src/components/search-planner/index.ts` | Export new component |

