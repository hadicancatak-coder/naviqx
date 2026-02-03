
# Campaign Log UI Fixes - Remove Duplicates & Perfect the Interface

## Problems Identified

| Issue | Location | Root Cause |
|-------|----------|------------|
| **Duplicate search bars** | CampaignsLog lines 155-162 + CampaignTable lines 213-220 | Both components render their own search input |
| **Duplicate entity selects** | CampaignsLog lines 164-174 + CampaignTable lines 222-235 | Entity filter defined in both places |
| **Version count always 0** | CampaignTable line 67 | versionCount hardcoded to 0, never fetched |
| **Entity select in table is broken** | CampaignTable line 222 | Missing `onValueChange` handler |

---

## Solution: Single Source of Truth

### Architecture Change

**Current (Broken):**
```text
CampaignsLog.tsx
├── Filter Bar (search + entity select) ← User sees this
├── CampaignTable.tsx
│   └── Another Filter Bar (search + entity select) ← User sees this too!
```

**Fixed:**
```text
CampaignsLog.tsx
├── Filter Bar (search + entity select + share button) ← Single filter bar
├── CampaignTable.tsx
│   └── Table only (receives filtered data as props)
```

---

## Changes to Make

### 1. CampaignTable.tsx - Remove Internal Filters

**Remove:**
- Internal `searchTerm` state (line 39)
- Internal filter bar JSX (lines 211-239)
- Internal filtering logic (use `entityFilter` prop properly)

**Keep:**
- Table sorting (still useful)
- Table rendering
- All CRUD handlers

**New Props:**
```typescript
interface CampaignTableProps {
  campaigns: CampaignRowData[]; // Already filtered by parent
  selectedCampaigns: string[];
  onSelectionChange: (ids: string[]) => void;
}
```

### 2. CampaignsLog.tsx - Be the Single Filter Source

- Already has search and entity filter ✓
- Pass filtered campaigns to table
- Add campaign count next to entity filter

### 3. Fix Version Count

In CampaignTable, fetch version counts efficiently:

```typescript
// Add query for all version counts at once
const { data: versionCounts = {} } = useQuery({
  queryKey: ['campaign-version-counts'],
  queryFn: async () => {
    const { data } = await supabase
      .from('utm_campaign_versions')
      .select('utm_campaign_id')
      .order('utm_campaign_id');
    
    // Count per campaign
    const counts: Record<string, number> = {};
    data?.forEach(v => {
      counts[v.utm_campaign_id] = (counts[v.utm_campaign_id] || 0) + 1;
    });
    return counts;
  }
});
```

Then use in rowData:
```typescript
versionCount: versionCounts[campaign.id] || 0
```

---

## File Changes

### CampaignTable.tsx

**Before (lines 209-239):**
```tsx
return (
  <div className="space-y-md">
    {/* Filters */}
    <div className="flex items-center gap-sm flex-wrap">
      <div className="relative flex-1 max-w-sm">
        <Search ... />
        <Input ... />
      </div>
      <Select value={entityFilter || "all"}>
        ...
      </Select>
      <span className="text-body-sm text-muted-foreground">
        {filteredData.length} campaigns
      </span>
    </div>

    {/* Table */}
    <div className="border rounded-lg...">
```

**After:**
```tsx
return (
  <div className="border rounded-lg overflow-hidden bg-card">
    <ScrollArea className="h-[600px]">
      <table className="w-full">
        ...
      </table>
    </ScrollArea>
    
    {/* Delete Dialog stays */}
  </div>
);
```

### CampaignsLog.tsx

**Enhance filter bar styling:**
- Add campaign count badge
- Keep single search + entity filter
- Share button only when entity selected

---

## Expected Result

| Before | After |
|--------|-------|
| Two search bars visible | One search bar |
| Two entity dropdowns | One entity dropdown |
| Confusing UX | Clear, single filter bar |
| Version counts always 0 | Accurate version counts |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/campaigns/CampaignTable.tsx` | Remove duplicate filter bar, accept filtered data via props, fix version counts |
| `src/pages/CampaignsLog.tsx` | Pass pre-filtered campaigns to table, clean up filter bar styling |

---

## Technical Details

### Removed from CampaignTable:
- Line 39: `const [searchTerm, setSearchTerm] = useState("");`
- Lines 73-89: Internal filtering logic (search + entity)
- Lines 211-239: Entire filter bar JSX

### Added to CampaignTable:
- New query for efficient version count fetching
- Props interface change to receive pre-filtered data

### Version Count Query Pattern:
Uses a single query to fetch all version counts, then maps them to campaigns. This is O(1) per campaign instead of O(n) queries.
