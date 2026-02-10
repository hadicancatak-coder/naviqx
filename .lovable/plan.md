
# Display & App Ad Editors with Custom Fields and Previews

## Problem

The editor currently renders **only Search ad fields** (15 headlines, 4 descriptions, sitelinks, callouts, DKI). When you create a Display or App campaign and add an ad, you get the same Search form -- which is completely wrong. These ad types have fundamentally different structures.

---

## What Each Ad Type Needs

### Search Ads (already implemented)
- 15 Headlines (30 chars each) with drag-to-reorder and DKI
- 4 Descriptions (90 chars each)
- Sitelinks (5 max)
- Callouts (4 max)
- Landing Page, Business Name, Path fields

### Display Ads (new)
- 1 Long Headline (90 chars) -- the main headline
- 5 Short Headlines (30 chars each) -- Google rotates these
- 5 Descriptions (90 chars each)
- CTA Button Text (e.g., "Learn More", "Sign Up", "Shop Now")
- Landing Page, Business Name
- DB columns already exist: `long_headline`, `short_headlines`, `cta_text`

### App Ads (new)
- 5 Headlines (30 chars each)
- 5 Descriptions (90 chars each)
- App Platform: Android or iOS (select)
- App Campaign Goal: Installs, In-App Events, or Retargeting (select)
- App Store URL (Google Play or App Store link)
- CTA Button Text
- Requires new DB columns: `app_platform`, `app_campaign_goal`, `app_store_url`

---

## Changes

### 1. Database Migration

Add App-specific columns to the `ads` table:

```sql
ALTER TABLE ads ADD COLUMN app_platform text;        -- 'android' | 'ios'
ALTER TABLE ads ADD COLUMN app_campaign_goal text;    -- 'installs' | 'in_app_events' | 'retargeting'
ALTER TABLE ads ADD COLUMN app_store_url text;
```

No new RLS policies needed -- existing `ads` policies cover these columns.

### 2. Refactor SearchAdEditor: Conditional Field Rendering

**File**: `src/components/search/SearchAdEditor.tsx`

The editor determines `adType` from `ad?.ad_type || propAdType || "search"`. Currently it always renders search fields. The change:

- Wrap the form body in a conditional:
  - `adType === "search"` -- render current search fields (headlines, descriptions, sitelinks, callouts, DKI, keywords)
  - `adType === "display"` -- render display fields (long headline, short headlines, descriptions, CTA)
  - `adType === "app"` -- render app fields (headlines, descriptions, app platform, campaign goal, app store URL, CTA)

- Update the `handleSave` function to include type-specific data:
  - Search: current behavior (headlines, descriptions, sitelinks, callouts)
  - Display: save `long_headline`, `short_headlines`, `descriptions`, `cta_text`
  - App: save `headlines`, `descriptions`, `app_platform`, `app_campaign_goal`, `app_store_url`, `cta_text`

- Update the title to show "Edit Display Ad" / "Create App Ad" etc.

### 3. Display Ad Form Section

New form section rendered when `adType === "display"`:

| Field | Type | Limit | Notes |
|-------|------|-------|-------|
| Long Headline | Single input | 90 chars | Primary headline, character counter |
| Short Headlines (1-5) | 5 inputs | 30 chars each | Progressive disclosure (start with 3) |
| Descriptions (1-5) | 5 inputs | 90 chars each | Progressive disclosure (start with 2) |
| CTA Text | Select dropdown | Preset options | "Learn More", "Sign Up", "Shop Now", "Get Quote", "Apply Now", "Contact Us", "Download", "Book Now" |
| Landing Page | Input | URL | Same as search |
| Business Name | Input | Text | Same as search |

### 4. App Ad Form Section

New form section rendered when `adType === "app"`:

| Field | Type | Limit | Notes |
|-------|------|-------|-------|
| App Platform | Select | "Android" / "iOS" | Required |
| Campaign Goal | Select | "Installs" / "In-App Events" / "Retargeting" | Required |
| App Store URL | Input | URL | Google Play or App Store link |
| Headlines (1-5) | 5 inputs | 30 chars each | Progressive disclosure |
| Descriptions (1-5) | 5 inputs | 90 chars each | Progressive disclosure |
| CTA Text | Select dropdown | Preset options | "Install", "Open", "Play Now", "Learn More", "Sign Up" |

### 5. Display Ad Preview Component

**New file**: `src/components/ads/DisplayAdPreview.tsx`

A banner-style preview that shows:
- Business name and "Ad" badge at the top
- Large image placeholder area (since we don't have image upload yet, show a placeholder)
- Short headline displayed prominently
- Description text below
- CTA button at the bottom
- Desktop/mobile toggle (banner vs. square format)

### 6. App Ad Preview Component

**New file**: `src/components/ads/AppAdPreview.tsx`

A mobile app install ad preview:
- App icon placeholder with app platform badge (Android/iOS)
- App name (from business name)
- Headline text
- Description text
- Star rating placeholder
- CTA install button
- Campaign goal badge (Installs/In-App/Retargeting)

### 7. Update SearchPlannerPreviewPanel

**File**: `src/components/search-planner/SearchPlannerPreviewPanel.tsx`

Add an `adType` prop. Based on the type:
- `search` -- current Google search ad preview (no change)
- `display` -- render `DisplayAdPreview` with long headline, short headlines, descriptions, CTA
- `app` -- render `AppAdPreview` with headlines, descriptions, app info, CTA

### 8. Update SearchPlanner Page

**File**: `src/pages/SearchPlanner.tsx`

- Pass `adType` to `SearchPlannerPreviewPanel` so it knows which preview to render
- Update `LiveFields` interface to include display/app-specific fields:
  ```typescript
  interface LiveFields {
    // Search fields (existing)
    headlines: string[];
    descriptions: string[];
    sitelinks: { description: string; link: string }[];
    callouts: string[];
    landingPage: string;
    businessName: string;
    // Display fields
    longHeadline?: string;
    shortHeadlines?: string[];
    ctaText?: string;
    // App fields
    appPlatform?: string;
    appCampaignGoal?: string;
    appStoreUrl?: string;
  }
  ```
- Update `onFieldChange` to pass these new fields from the editor

### 9. Update SearchPlannerQualityPanel

The quality/compliance panel needs to adapt per ad type:
- Search: current behavior (ad strength, MENA compliance, keyword relevance)
- Display: simplified scoring (headline presence, description presence, CTA selected, image placeholder note)
- App: simplified scoring (app URL validation, platform selected, goal selected, headline/description presence)

### 10. Config Updates

**File**: `src/config/searchAdsConfig.ts`

Add display and app config sections:

```typescript
display: {
  longHeadline: { maxCharacters: 90 },
  shortHeadlines: { maxCount: 5, maxCharacters: 30 },
  descriptions: { maxCount: 5, maxCharacters: 90 },
  ctaOptions: ['Learn More', 'Sign Up', 'Shop Now', ...],
},
app: {
  headlines: { maxCount: 5, maxCharacters: 30 },
  descriptions: { maxCount: 5, maxCharacters: 90 },
  platforms: ['android', 'ios'],
  goals: ['installs', 'in_app_events', 'retargeting'],
  ctaOptions: ['Install', 'Open', 'Play Now', ...],
}
```

---

## Files Modified

| File | Change |
|------|--------|
| Database migration | Add `app_platform`, `app_campaign_goal`, `app_store_url` columns |
| `src/config/searchAdsConfig.ts` | Add display and app config sections |
| `src/components/search/SearchAdEditor.tsx` | Conditional form rendering per adType, update save logic |
| `src/components/ads/DisplayAdPreview.tsx` | New banner-style preview component |
| `src/components/ads/AppAdPreview.tsx` | New app install preview component |
| `src/components/search-planner/SearchPlannerPreviewPanel.tsx` | Accept adType prop, render correct preview |
| `src/pages/SearchPlanner.tsx` | Pass adType to preview, extend LiveFields for display/app fields |
| `src/components/search-planner/SearchPlannerQualityPanel.tsx` | Adapt scoring per ad type |

## Implementation Order

1. Database migration (add app columns)
2. Update config with display/app field specs
3. Create `DisplayAdPreview.tsx` and `AppAdPreview.tsx`
4. Update `SearchAdEditor.tsx` with conditional rendering + save logic
5. Update `SearchPlannerPreviewPanel.tsx` to accept adType and render correct preview
6. Update `SearchPlanner.tsx` to pass adType and extended LiveFields
7. Update `SearchPlannerQualityPanel.tsx` for type-aware scoring
