

# Campaign-Level Settings + Validation Engine + Quality Panel Adaptation

## What's Wrong Today

When you click a campaign name in the structure panel, the middle column goes **blank** ("Select an Ad to Edit"). There's no campaign-level configuration at all. The Quality Panel only understands Search ad metrics (Headlines 0/15, Descriptions 0/4, Sitelinks, Callouts). Display and App ads get the same irrelevant scoring.

The previous plan overcomplicated things by proposing targeting blocks (demographics, geography, content). That's unnecessary -- **targeting is entity-based** in this system. This plan strips it down to what actually matters per campaign type.

---

## What Changes

### 1. Database Migration

Add campaign-level configuration columns to `search_campaigns`:

```sql
-- App campaign settings
ALTER TABLE search_campaigns ADD COLUMN app_platform text;
ALTER TABLE search_campaigns ADD COLUMN app_store_id text;
ALTER TABLE search_campaigns ADD COLUMN app_store_url text;
ALTER TABLE search_campaigns ADD COLUMN app_objective text;
ALTER TABLE search_campaigns ADD COLUMN optimization_goal text;
ALTER TABLE search_campaigns ADD COLUMN optimization_event text;
ALTER TABLE search_campaigns ADD COLUMN bidding_type text;
ALTER TABLE search_campaigns ADD COLUMN bidding_target numeric;
ALTER TABLE search_campaigns ADD COLUMN audience_mode text;

-- Display campaign settings
ALTER TABLE search_campaigns ADD COLUMN display_objective text;

-- Shared readiness tracking
ALTER TABLE search_campaigns ADD COLUMN readiness_status text DEFAULT 'not_ready';
```

All nullable. Existing campaigns unaffected.

### 2. CampaignDetailPanel (new component)

**New file**: `src/components/search-planner/CampaignDetailPanel.tsx`

When a user clicks a campaign name, this fills the middle column instead of blank space. It adapts sections based on `campaign_type`.

#### Search campaigns show:
- Campaign name (editable inline)
- Objective (editable)
- Status badge
- Readiness status (computed from child ad groups and ads)
- Google Parity Checklist (collapsible)

#### App campaigns show:
- Campaign name + status
- **Objective**: App Installs / App Engagement / App Pre-Registration (select)
- **Optimization Goal**: Installs / In-app Action (select). If In-app Action: event name input
- **Bidding**: Target CPI / Target CPA (select + numeric input)
- **Platform & Store**: Android / iOS (select), App ID input, Store URL (derived, read-only)
- **Audience Mode**: All users / New users only / Existing users (select)
- Readiness status + Google Parity Checklist

#### Display campaigns show:
- Campaign name + status
- **Objective**: Awareness / Consideration / Conversions (select)
- Readiness status + Google Parity Checklist

No targeting blocks, no demographics, no geography. Entity handles that.

### 3. Validation Engine

**New file**: `src/lib/campaignValidation.ts`

Pure function: takes campaign + its ad groups + their ads, returns:

```typescript
interface ValidationResult {
  ready: boolean;
  blocking: string[];
  warnings: string[];
}
```

**Search rules:**
- FAIL: No ad groups
- FAIL: Any ad group has 0 ads
- FAIL: Any ad has fewer than 3 headlines or 2 descriptions
- FAIL: Any ad missing landing page
- FAIL: Any ad group has 0 keywords
- WARN: Any ad has fewer than 10 headlines

**App rules:**
- FAIL: No objective
- FAIL: No optimization goal
- FAIL: No app platform
- FAIL: No app store ID
- FAIL: No ad groups or any ad has 0 headlines/descriptions
- WARN: Only one headline per ad

**Display rules:**
- FAIL: No ad groups
- FAIL: Any ad missing short headline or description
- FAIL: Any ad missing business name
- WARN: No long headline on any ad
- WARN: No objective set

### 4. Google Parity Checklist

**New file**: `src/components/search-planner/GoogleParityChecklist.tsx`

Collapsible panel with green checkmark / red X per requirement. Embedded inside `CampaignDetailPanel` and also available in the Quality panel.

**Search checklist:**
- At least 1 RSA per ad group
- 3+ headlines per RSA
- 2+ descriptions per RSA
- Final URL set
- Keywords present

**App checklist:**
- Objective selected
- Optimization goal selected
- App linked (platform + store ID)
- At least 1 headline
- At least 1 description
- Audience mode defined
- Bidding strategy defined

**Display checklist:**
- At least 1 short headline
- At least 1 description
- Business name set
- Long headline present (recommended)
- Objective set

### 5. Update Quality Panel

**File**: `src/components/search-planner/SearchPlannerQualityPanel.tsx`

Add `adType` prop. Metrics adapt per type:

- **Search** (no change): Headlines 0/15, Descriptions 0/4, Sitelinks, Callouts, Ad Strength, MENA policy
- **Display**: Short Headlines x/5, Descriptions x/5, Long Headline present/missing, CTA set/missing. No sitelinks/callouts metrics
- **App**: Headlines x/5, Descriptions x/5, Platform set, Goal set, Store URL set. No sitelinks/callouts metrics

When no ad is selected but a campaign is, show campaign-level readiness instead of ad-level metrics.

### 6. Readiness Dots in Structure Panel

**File**: `src/components/search-planner/SearchPlannerStructurePanel.tsx`

Each campaign row gets a small colored dot:
- Green: READY (all validation passes)
- Red: NOT READY (any blocking issue)
- Computed client-side using the validation engine against loaded hierarchy data

### 7. Wire CampaignDetailPanel into SearchPlanner

**File**: `src/pages/SearchPlanner.tsx`

- Add `campaignContext` state (like `editorContext` and `adGroupContext`)
- `handleCampaignClick` sets `campaignContext` instead of clearing everything
- Middle column renders `CampaignDetailPanel` when `campaignContext` is set
- Right column shows campaign-level readiness + parity checklist when campaign is selected

---

## Files

| File | Change |
|------|--------|
| Database migration | Add campaign-level columns |
| `src/lib/campaignValidation.ts` | **New** -- validation engine |
| `src/components/search-planner/GoogleParityChecklist.tsx` | **New** -- parity checklist |
| `src/components/search-planner/CampaignDetailPanel.tsx` | **New** -- campaign config panel |
| `src/components/search-planner/SearchPlannerQualityPanel.tsx` | Add `adType` prop, type-aware metrics |
| `src/components/search-planner/SearchPlannerStructurePanel.tsx` | Readiness dots on campaign rows |
| `src/components/search-planner/index.ts` | Export new components |
| `src/pages/SearchPlanner.tsx` | Wire campaign click to detail panel, pass adType to quality panel |

## Implementation Order

1. Database migration
2. `campaignValidation.ts`
3. `GoogleParityChecklist.tsx`
4. `CampaignDetailPanel.tsx`
5. Update `SearchPlannerQualityPanel.tsx`
6. Update `SearchPlannerStructurePanel.tsx` (readiness dots)
7. Update `SearchPlanner.tsx` (wire everything)
8. Update `index.ts` exports

