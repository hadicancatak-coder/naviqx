
# Asset Intelligence: Policy Prediction + Best-Performing Asset Library

## Overview

Build a new **Asset Intelligence** feature that ingests historical Google Ads asset data (from CSV files per country), stores it in the database, and uses it for two purposes:

1. **Policy Prediction**: When planning ads in the Google Planner, automatically check if a headline/description/callout has been previously approved or disapproved in a specific country -- giving advertisers a heads-up before submitting.

2. **Asset Library**: A dedicated page where advertisers can browse, filter, and reuse their best-performing assets (sorted by interaction rate, conversions) across countries and asset types.

---

## 1. New Database Table: `asset_intelligence`

Stores parsed asset data from the uploaded CSVs. Each row = one unique asset + country combination with aggregated performance.

```text
asset_intelligence
  id              uuid (PK)
  entity          text (country: Lebanon, Jordan, Kuwait)
  asset_text      text (the headline/description/callout/sitelink text)
  asset_type      text (Headline, Description, Callout, Sitelink)
  google_asset_id text (original asset_id from Google)
  policy_status   text (approved, disapproved, mixed)
  review_status   text (reviewed, pending)
  level           text (Ad, Ad group, Campaign)
  total_interactions  integer
  interaction_rate    decimal
  total_conversions   decimal
  appearance_count    integer (how many times this asset appeared)
  approved_count      integer
  disapproved_count   integer
  best_interaction_rate decimal (peak performance)
  added_by        text (Advertiser, Google AI)
  language        text (EN, AR -- auto-detected)
  created_by      uuid
  created_at      timestamptz
  updated_at      timestamptz
```

RLS: Authenticated users can read; admins can manage.

## 2. CSV Import Edge Function: `import-asset-intelligence`

A backend function that:
- Accepts a CSV file upload (multipart) + entity name
- Parses the complex multi-line CSV format (asset blocks with nested `text_asset`, `callout_asset`, `sitelink_asset`, `policy_info`)
- Extracts: asset text, asset type, policy status, interactions, interaction rate, conversions
- Deduplicates by asset text + entity (aggregates counts)
- Upserts into `asset_intelligence`
- Returns import summary (total parsed, new, updated, skipped)

## 3. Asset Library Page: `/asset-library`

A new page with:

**Header**: Title + Import CSV button (opens file picker, calls edge function)

**Filter Bar**:
- Country filter (Lebanon, Jordan, Kuwait, All)
- Asset type filter (Headline, Description, Callout, Sitelink)
- Policy status filter (Approved, Disapproved, Mixed)
- Language filter (EN, AR)
- Sort by: Interaction Rate, Conversions, Alphabetical

**Asset Table/Grid**:
- Each row shows: Asset text, Type badge, Country, Policy status (green/red/yellow dot), Interactions, Interaction Rate, Conversions, Language
- Click to copy asset text
- "Use in Ad" button that copies text to clipboard for quick paste into planner

**Performance Insights Card** (top):
- Total assets by country
- Approval rate percentage per country
- Top 5 best-performing assets
- Disapproval patterns (common words/phrases that get rejected)

## 4. Policy Prediction in Google Planner

Integrate into the existing ad editor workflow:

**In `SearchAdEditor.tsx`**:
- When a user types a headline or description, query `asset_intelligence` for matches in the selected entity
- Show inline badges:
  - Green checkmark: "Previously approved in [Country]" with interaction rate
  - Red warning: "Previously disapproved in [Country]" with reason context
  - Yellow: "Mixed results -- approved in some placements, disapproved in others"
- Auto-suggest: Show a dropdown of top-performing approved assets as the user types (typeahead from the library)

**In `SearchPlannerQualityPanel.tsx`**:
- Add a new "Asset Intelligence" section showing policy prediction for all current ad fields
- Aggregate score: "X of Y assets have been previously approved in [Entity]"

## 5. Sidebar Navigation

Add "Asset Library" entry under the Ads/Google section in the sidebar.

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/import-asset-intelligence/index.ts` | CSV parser edge function |
| `src/pages/AssetLibrary.tsx` | Asset Library page |
| `src/hooks/useAssetIntelligence.ts` | Hook for querying/filtering assets |
| `src/components/asset-intelligence/AssetImportDialog.tsx` | CSV upload dialog with entity picker |
| `src/components/asset-intelligence/AssetTable.tsx` | Filterable asset data table |
| `src/components/asset-intelligence/PolicyPredictionBadge.tsx` | Inline approval prediction badge |
| `src/components/asset-intelligence/AssetInsightsCard.tsx` | Performance summary card |
| `src/components/asset-intelligence/AssetTypeahead.tsx` | Auto-suggest from approved assets |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/search/SearchAdEditor.tsx` | Add policy prediction badges + asset typeahead on headline/description inputs |
| `src/components/search-planner/SearchPlannerQualityPanel.tsx` | Add Asset Intelligence section |
| `src/components/layout/AppSidebar.tsx` | Add Asset Library nav item |
| `src/App.tsx` | Add `/asset-library` route |
| Database migration | Create `asset_intelligence` table with indexes and RLS |

### CSV Parsing Strategy

The CSV has a complex multi-line format where each "row" spans multiple lines due to nested asset blocks. The edge function will:
1. Read the raw text and split by the `Enabled,` or `Paused,` row delimiter
2. For each block, extract: asset_id, text content, asset type, policy status
3. Parse the trailing CSV fields: Level, Status, Status reason, interactions, interaction rate, conversions
4. Auto-detect language (Arabic vs English) using the existing `detect_language` pattern
5. Upsert with aggregation (sum interactions/conversions, track approved vs disapproved counts)

### Policy Prediction Logic

When checking an asset in the planner:
1. Query `asset_intelligence` WHERE `asset_text ILIKE %input%` AND `entity = selected_entity`
2. If exact match found: show definitive approved/disapproved badge
3. If partial match: show "similar asset was approved/disapproved" as a softer hint
4. If no match: no prediction shown (neutral)
