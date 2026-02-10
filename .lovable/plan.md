

# Search Planner Enhancements: Bidding Strategy, Keywords, and MENA Warnings

## Summary

| Change | Location | Impact |
|--------|----------|--------|
| Replace Max CPC with Bidding Strategy select | Ad Group Dialog | Medium |
| Add Keyword Match Type Strategy to Ad Group | Ad Group Dialog | Medium |
| Add Keyword Strategy section to Ad Editor | Ad Editor (ad group level) | Medium |
| Remove Compliance Check card | Quality Panel | Low |
| Replace with MENA policy + relevancy + intent warnings | Quality Panel + adQualityScore | Medium |
| Database migration | ad_groups table | Low |

---

## 1. Ad Group Dialog: Replace Max CPC with Bidding Strategy + Match Types

### Remove
- Max CPC input field

### Add

**Bidding Strategy** (required select):
- Maximize Clicks
- Maximize Conversions
- Target CPA (tCPA)
- Target ROAS (tROAS)
- Maximize Conversion Value
- Manual CPC
- Enhanced CPC (eCPC)

**Keyword Match Type Strategy** (required, multi-select checkboxes):
- Exact Match
- Phrase Match
- Broad Match

### Database Migration
```sql
ALTER TABLE ad_groups 
  ADD COLUMN bidding_strategy text,
  DROP COLUMN max_cpc;
```
(match_types column already exists as JSONB)

### File: `src/components/ads/CreateAdGroupDialog.tsx`
- Remove `maxCpc` state, add `biddingStrategy` and `matchTypes` states
- Replace Max CPC input with Bidding Strategy Select
- Add match type checkboxes (at least one required)
- Save `bidding_strategy` and `match_types` on insert

---

## 2. Keyword Strategy Section in Ad Editor

New component: `src/components/search-planner/KeywordStrategySection.tsx`

Displayed in `SearchAdEditor.tsx` when an ad group is selected. Features:
- Shows ad group's selected match types as badges
- Up to 20 keyword inputs
- Each keyword shows match type notation: `[exact]`, `"phrase"`, `broad`
- Counter: "X/20 keywords"
- Keywords saved to `ad_groups.keywords` JSONB column

### File: `src/components/search/SearchAdEditor.tsx`
- Import and render `KeywordStrategySection` below Callouts section
- Pass `adGroup.id` and `adGroup.match_types`

---

## 3. Remove Compliance Check from Quality Panel

### File: `src/components/search-planner/SearchPlannerQualityPanel.tsx`
- Remove the entire "Compliance Check" card (lines 197-247)
- Remove `checkCompliance` import and usage

---

## 4. Replace with MENA-Focused Warnings in Ad Strength Card

Add three new warning sections inside the Ad Strength card:

### a) Ad Relevancy Warnings
- Headline variety check (questions, CTAs, benefits, numbers)
- Description CTA presence
- Character utilization efficiency

### b) Intent Catch Warnings
- Check if headlines cover the ad group's selected match types
- Warn if broad match selected but headlines lack generic terms
- Warn if exact match selected but no headline contains primary keyword

### c) MENA Policy Warnings (Lebanon, Jordan, Kuwait)
- **Lebanon**: BDL compliance for financial ads, MoH for pharma, political content sensitivity
- **Jordan**: JSC disclosure for financial, TRC for telecom, JREI for real estate
- **Kuwait**: CBK compliance for financial, Ministry of Commerce for e-commerce, content modesty

Props update: `SearchPlannerQualityPanel` will accept optional `entity` (already has it), `keywords`, and `matchTypes` to power these checks.

### Files Modified
- `src/components/search-planner/SearchPlannerQualityPanel.tsx` -- remove compliance card, add warning sections
- `src/lib/adQualityScore.ts` -- add MENA policy warning functions, relevancy checks, intent catch checks

---

## Implementation Order

1. Database migration (add `bidding_strategy`, drop `max_cpc`)
2. Update `CreateAdGroupDialog.tsx` (bidding strategy + match types)
3. Create `KeywordStrategySection.tsx`
4. Update `SearchAdEditor.tsx` to include keyword section
5. Overhaul `SearchPlannerQualityPanel.tsx` (remove compliance, add warnings)
6. Update `adQualityScore.ts` with MENA + relevancy + intent functions

