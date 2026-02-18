
# Search Planner: External Sharing, Entity Fix, and Campaign Type Differentiation

## Issues Identified

### 1. External sharing shows everything, no granularity
Currently, the Share dialog always creates an entity-wide link (`resource_id: null`) that dumps ALL campaigns for the entity. There's no way to share just one ad, one ad group, or one campaign.

### 2. Ads don't render in the external review
The external review component (`SearchAdsReviewContent.tsx`) treats headlines/descriptions as `{text: string}` objects, but the database stores them as plain strings (`["headline1", "headline2"]`). This mismatch means every `.text` access returns `undefined` and nothing displays.

### 3. Can't create campaigns in entities other than UAE
The `CreateCampaignDialog` defaults to UAE and uses `useSystemEntities` correctly, but the `SearchPlannerStructurePanel` initializes `selectedEntity` to empty string and defaults to UAE. The entity selector in the create dialog is driven by the panel's `selectedEntity` -- this works. However, the campaign query filters by `selectedEntity`, and when switching entities, any existing campaigns appear. The real issue is the campaign query uses entity matching, and the create dialog passes `defaultEntity={selectedEntity}` which should work for all entities. Let me verify further...

Actually, re-reading the code: the `CreateCampaignDialog` receives `defaultEntity` and sets entity from it. Entity selector uses `systemEntities` which has all 11 entities. The creation itself does `entity: entity.trim()` which should work. The issue may be that `defaultEntity` resets to UAE on dialog close. Looking at line 96: `setEntity(defaultEntity || "UAE")` -- after creation it resets to `defaultEntity || "UAE"`. This is fine as long as the panel passes the right entity. The panel does pass `selectedEntity`. So creating in non-UAE entities should work unless there's a UI issue where the entity selector resets. This needs testing, but I'll ensure the flow is solid.

### 4. Campaign types not properly differentiated
While the hierarchy tree shows type badges (Search/Display/App), there's no visual differentiation in the campaign rows beyond a small badge. The external review doesn't distinguish types at all. Display and App campaigns show the same Google SERP preview which is wrong.

---

## Plan

### A. Granular Sharing Scope Selection

**File: `src/components/search/SearchAdsShareDialog.tsx`**
- Redesign the dialog to include a **scope selector** with 3 levels:
  - **Entity-wide**: Share all campaigns for the entity (current behavior)
  - **Campaign**: Share a specific campaign (stores `resource_id = campaign.id` with metadata `{scope: 'campaign'}`)
  - **Ad Group**: Share a specific ad group (stores `resource_id = ad_group.id` with metadata `{scope: 'ad_group'}`)
- Add a cascading selector: Entity -> Campaign dropdown -> Ad Group dropdown (optional)
- The `public_access_links.resource_id` field already exists and accepts UUIDs; `metadata` JSONB can store `{scope: 'entity'|'campaign'|'ad_group'}`

**File: `src/pages/SearchPlanner.tsx`**
- Pass current context (selected campaign/ad group/ad) to the share dialog so it can pre-populate the scope

### B. Fix External Ad Preview Rendering

**File: `src/components/external/SearchAdsReviewContent.tsx`**
- Fix the data format mismatch: headlines/descriptions are stored as `string[]` not `{text: string}[]`
- Update the rendering logic to handle both formats:
  ```
  const getTextValue = (item) => typeof item === 'string' ? item : item?.text || '';
  ```
- Similarly fix sitelinks (stored as `{description, link}` not `{headline, description1, description2, finalUrl}`)
- Add campaign type awareness: for Display/App campaigns, render appropriate preview layouts instead of always showing Google SERP
- Add proper empty state when an ad has no content

**Scope-aware data fetching in external review:**
- Read `metadata.scope` from `accessData` to determine what to fetch:
  - `scope: 'entity'` or no scope: fetch all campaigns for the entity (current)
  - `scope: 'campaign'`: fetch only the campaign matching `resource_id`
  - `scope: 'ad_group'`: fetch only the ad group matching `resource_id` and its parent campaign

### C. Entity Selection Fix for Campaign Creation

**File: `src/components/ads/CreateCampaignDialog.tsx`**
- Remove the auto-default to UAE when `defaultEntity` is provided -- respect whatever entity the panel passes
- When `defaultEntity` changes (user switches entity in the panel), sync the dialog's internal state

**File: `src/components/search-planner/SearchPlannerStructurePanel.tsx`**
- Ensure the entity from the panel is always passed correctly to the create dialog

### D. Campaign Type Visual Differentiation

**File: `src/components/search-planner/SearchPlannerStructurePanel.tsx`**
- Add distinct visual treatment per campaign type in the tree:
  - Search campaigns: blue left border accent
  - Display campaigns: purple left border accent
  - App campaigns: green left border accent
- Show campaign type icon more prominently in the campaign row

**File: `src/components/external/SearchAdsReviewContent.tsx`**
- Show campaign type badge in external review
- For Display campaigns: render a display ad mockup (image placeholder + headlines) instead of SERP
- For App campaigns: render an app install ad mockup (app icon + store button) instead of SERP

---

## Technical Details

### Files to Create
None -- all changes are modifications to existing files.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/search/SearchAdsShareDialog.tsx` | Add scope selector (Entity/Campaign/Ad Group), cascading dropdowns, pass scope in metadata |
| `src/pages/SearchPlanner.tsx` | Pass campaign/adGroup context to share dialog |
| `src/components/external/SearchAdsReviewContent.tsx` | Fix data format (string[] vs object[]), add scope-aware fetching, add campaign type-specific previews |
| `src/components/ads/CreateCampaignDialog.tsx` | Fix entity defaulting behavior |
| `src/components/search-planner/SearchPlannerStructurePanel.tsx` | Add colored left borders per campaign type |

### Database Changes
None required. The existing `public_access_links` table has `resource_id` (UUID) and `metadata` (JSONB) fields which can store the scope and any additional context.

### Data Format Fix (Critical)
The external review currently does:
```typescript
const headlines = (ad.headlines as {text: string}[]).filter(h => h?.text);
```
But the actual data is `["headline1", "headline2"]`. The fix normalizes both formats:
```typescript
const toDisplayArray = (arr: unknown) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => typeof item === 'string' ? item : item?.text || '').filter(Boolean);
};
```
