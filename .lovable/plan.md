
# Fix: Type-Aware Fields, Remove Asset Upload, Link to Campaigns Log

## Problems Identified

1. **AssetPicker (creative upload) is embedded in the Ad Editor** for Display and App ads -- user wants it removed entirely
2. **CreateAdGroupDialog shows Search fields (Keyword Match Types, Search bidding strategies) for ALL campaign types** -- App ad groups need Platform (iOS/Android) and Sub-type (Installs/Engagement); Display needs Targeting Method
3. **AdGroupDetailPanel always shows Search-specific cards** (Match Types, Keywords) regardless of campaign type
4. **Ad Editor shows App Platform/Goal fields at the ad level** -- these belong at the campaign/ad-group level, not per-ad
5. **No option to link an ad to a campaign from the Campaigns Log** (utm_campaigns table)
6. **Previews reference uploaded assets** -- should work purely from text fields per type

---

## Changes

### 1. Remove AssetPicker from Ad Editor

**File**: `src/components/search/SearchAdEditor.tsx`

- Delete the "Creative Assets" section and `AssetPicker` usage from both the Display block (~lines 839-847) and the App block (~lines 970-978)
- Remove the `AssetPicker` import
- The Display ad editor keeps: Long Headline, Short Headlines, Descriptions, CTA, Landing Page, Business Name
- The App ad editor keeps: Headlines, Descriptions, CTA, Business Name (Platform/Goal/Store URL stay at campaign level -- see point 4)

### 2. Remove App Platform/Goal/Store URL from Ad Editor

**File**: `src/components/search/SearchAdEditor.tsx`

- Remove `appPlatform`, `appCampaignGoal`, `appStoreUrl` fields from the App ad editing section (~lines 853-883) -- these are already managed in `CampaignDetailPanel` at the campaign level
- Remove associated state variables and their sync to `onFieldChange`
- App ad editor will only have: Headlines, Descriptions, CTA, Business Name

### 3. Make CreateAdGroupDialog type-aware

**File**: `src/components/ads/CreateAdGroupDialog.tsx`

Add `campaignType` prop. Render different fields per type:

- **Search**: Name + Bidding Strategy (full list) + Keyword Match Types (existing behavior)
- **App**: Name + Platform (Android/iOS) + Campaign Sub-type (App Installs/App Engagement)
- **Display**: Name + Targeting Method (Contextual/Audience/Placement) + Bidding Strategy (filtered to: Maximize Clicks, Maximize Conversions, Target CPA, Target ROAS)

Validation per type:
- Search: name + bidding + match types required
- App: name + platform + sub-type required
- Display: name required, rest optional

Database insert adapts: stores `app_platform`, `app_subtype`, `targeting_method` columns (requires migration).

### 4. Make AdGroupDetailPanel type-aware

**File**: `src/components/search-planner/AdGroupDetailPanel.tsx`

Accept a `campaignType` prop (derived from the parent campaign). Conditionally render:

- **Search**: Bidding Strategy + Match Types + Keywords (current behavior)
- **App**: Platform + Sub-type display (read from ad group record) -- no keywords or match types
- **Display**: Targeting Method + Bidding Strategy -- no keywords or match types

### 5. Add "Link to Campaign" selector (Campaigns Log)

**File**: `src/components/search/SearchAdEditor.tsx`

Add a dropdown in the ad editor (all types) that fetches campaigns from `utm_campaigns` table and lets the user pick one to associate. This stores a `utm_campaign_id` on the ad record, linking the Google Planner ad to an existing Campaign Log entry.

Requires a new column `utm_campaign_id` on the `ads` table (migration).

### 6. Fix Preview Panel -- remove asset dependency for Display/App

**File**: `src/components/search-planner/SearchPlannerPreviewPanel.tsx`

- Remove the `campaign_assets` query (lines 57-69)
- Pass empty assets array to `PreviewAssemblyEngine` -- previews render from text fields only
- Remove `AssetPicker` type import

**File**: `src/components/search-planner/PreviewAssemblyEngine.tsx`

- When no image assets exist, show placeholder boxes (already handled) -- no "upload required" warnings
- Keep the placement tabs functional using text-only rendering

### 7. Wire campaignType through the hierarchy

**File**: `src/components/search-planner/SearchPlannerStructurePanel.tsx`

- Update `showCreateAdGroup` state to include `campaignType`
- Pass `campaignType` to `CreateAdGroupDialog`
- Pass `campaignType` when calling `onAdGroupClick`

**File**: `src/pages/SearchPlanner.tsx`

- Pass `campaignType` from `adGroupContext.campaign.campaign_type` to `AdGroupDetailPanel`

---

## Technical Details

### Database Migration

```sql
-- Add type-aware fields to ad_groups
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS app_platform text;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS app_subtype text;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS targeting_method text;

-- Add utm_campaign link to ads
ALTER TABLE ads ADD COLUMN IF NOT EXISTS utm_campaign_id uuid REFERENCES utm_campaigns(id);
```

### Files Changed Summary

| File | Change |
|------|--------|
| `src/components/search/SearchAdEditor.tsx` | Remove AssetPicker, remove app platform/goal/store from ad level, add utm_campaign_id selector |
| `src/components/ads/CreateAdGroupDialog.tsx` | Add campaignType prop, render type-specific fields |
| `src/components/search-planner/AdGroupDetailPanel.tsx` | Add campaignType prop, hide Search-only cards for App/Display |
| `src/components/search-planner/SearchPlannerPreviewPanel.tsx` | Remove asset query, pass empty assets |
| `src/components/search-planner/SearchPlannerStructurePanel.tsx` | Pass campaignType to dialog and callbacks |
| `src/pages/SearchPlanner.tsx` | Wire campaignType to AdGroupDetailPanel |
| Database migration | Add columns to ad_groups and ads tables |
