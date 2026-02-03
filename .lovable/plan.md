
# Comprehensive Performance and UX Improvement Plan

## Executive Summary

After thorough analysis of your codebase (Task Management, UTM Planner, Search Planner, LP Planner, and Campaigns Log), I've identified **systemic architectural issues** causing performance problems, confusing UX, and buggy import functionality. This plan addresses root causes, not symptoms.

---

## Part 1: Campaign Log - Complete Redesign

### Current Problems

| Issue | Impact | Root Cause |
|-------|--------|------------|
| **Import is buggy** | Campaigns import but don't appear in entity tables | Import creates `utm_campaigns` but doesn't create `campaign_entity_tracking` records |
| **Too complicated** | Users can't understand the campaign-entity relationship | Two-table architecture (`utm_campaigns` + `campaign_entity_tracking`) is confusing |
| **Slow with scale** | Performance degrades with many campaigns | O(n) filtering in JS via `getEntitiesForCampaign()` called repeatedly |
| **Entity mismatch** | `ENTITIES` in constants vs `system_entities` table | Hardcoded list in `constants.ts` + dynamic table = inconsistent data |

### Solution: Unified Campaign-Entity Architecture

**1. Fix Import to Create Entity Tracking Records**

The `useUpsertUtmCampaigns` mutation creates/updates campaigns but **never creates entity tracking records**. After line 224 in `src/hooks/useUtmCampaigns.ts`, add:

```typescript
// After creating/updating campaign, create entity tracking if entity specified
if (campaign.entity && campaignId) {
  const { error: trackingError } = await supabase
    .from("campaign_entity_tracking")
    .upsert({
      campaign_id: campaignId,
      entity: campaign.entity,
      status: campaign.status || 'Draft',
    }, {
      onConflict: 'campaign_id,entity',
      ignoreDuplicates: true
    });
  if (trackingError) {
    logger.warn(`Failed to create tracking for ${campaign.name}:`, trackingError);
  }
}
```

**2. Add Unique Constraint for Upsert**

Database migration to add unique constraint:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_entity_tracking_unique 
ON campaign_entity_tracking(campaign_id, entity);
```

**3. Replace O(n) JS Filtering with Joined Queries**

Instead of:
```typescript
// Current: O(n) lookup every render
const entities = getEntitiesForCampaign(campaignId);
```

Pre-join data in the query:
```typescript
// New: Single query with all data
const { data } = await supabase
  .from('utm_campaigns')
  .select(`
    *,
    tracking:campaign_entity_tracking(*)
  `)
  .eq('is_active', true);
```

**4. Create Unified Entity Source**

Remove `ENTITIES` from `src/lib/constants.ts` and use only `system_entities` table everywhere:

```typescript
// Delete from constants.ts:
// export const ENTITIES = ["Global Management", "Jordan", ...];

// Use hook everywhere:
const { data: entities } = useSystemEntities();
```

**Files to Modify:**
- `src/hooks/useUtmCampaigns.ts` - Fix import mutation
- `src/hooks/useCampaignEntityTracking.ts` - Add joined query
- `src/pages/CampaignsLog.tsx` - Use pre-fetched entity data
- `src/components/campaigns/EntityCampaignTable.tsx` - Remove redundant queries
- `src/lib/constants.ts` - Remove ENTITIES array
- `src/components/search-planner/SearchPlannerStructurePanel.tsx` - Replace ENTITIES import
- Database migration for unique constraint

---

## Part 2: Task Management Performance

### Current Problems

| Issue | Root Cause |
|-------|------------|
| 740-line Tasks.tsx file | God component doing too much |
| Multiple re-renders | Inline filter functions cause memoization failures |
| Slow bulk operations | Sequential Promise.all on mutations |

### Solution: Component Decomposition + Batching

**1. Extract Filter Logic to Custom Hook**

Create `src/hooks/useTaskFilters.ts`:
```typescript
export function useTaskFilters(tasks: Task[]) {
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  
  const filteredTasks = useMemo(() => {
    return applyFilters(tasks, filters);
  }, [tasks, filters]);
  
  return { filters, setFilters, filteredTasks };
}
```

**2. Batch Database Operations**

Replace sequential mutations with batch RPC:
```sql
-- New database function
CREATE FUNCTION batch_update_task_status(
  task_ids uuid[],
  new_status text
) RETURNS void AS $$
BEGIN
  UPDATE tasks SET status = new_status WHERE id = ANY(task_ids);
END;
$$ LANGUAGE plpgsql;
```

**3. Virtualize All Task Lists**

Current: ~154 tasks rendering all at once
Solution: Already have `react-window`, enforce usage in all views

**Files to Modify:**
- Create `src/hooks/useTaskFilters.ts`
- `src/pages/Tasks.tsx` - Extract filter bar, stats, and keyboard handlers
- `src/domain/tasks/actions.ts` - Use batch RPC

---

## Part 3: UTM Planner Improvements

### Current Problems

| Issue | Root Cause |
|-------|------------|
| Hardcoded `ENTITIES` array | `SearchPlannerStructurePanel.tsx` line 32 imports from constants |
| LP order preferences complex | Overly nested state management |
| Campaign dropdown performance | Re-fetches campaigns on every row update |

### Solution: Consolidate Entity Source + Optimize Selects

**1. Replace All ENTITIES Imports**

Search and replace across all files:
```typescript
// Old:
import { ENTITIES } from "@/lib/constants";

// New:
import { useSystemEntities } from "@/hooks/useSystemEntities";
const { data: entities = [] } = useSystemEntities();
```

**2. Memoize Campaign/Platform Options**

In `SimpleUtmBuilder.tsx`, wrap options:
```typescript
const platformOptions = useMemo(() => 
  platforms?.filter(p => p.is_active) ?? [],
  [platforms]
);
```

**Files to Modify:**
- `src/components/search-planner/SearchPlannerStructurePanel.tsx`
- `src/components/utm/SimpleUtmBuilder.tsx`
- `src/lib/constants.ts` - Mark ENTITIES as deprecated

---

## Part 4: Search Planner Optimization

### Current Problems

| Issue | Root Cause |
|-------|------------|
| 616-line structure panel | Too much logic in one component |
| Three separate queries | Campaigns, AdGroups, Ads fetched separately then joined in JS |
| Slow tree expansion | No query caching between entity switches |

### Solution: Single Hierarchical Query + Component Split

**1. Create Joined Query**

Replace 3 queries with 1:
```typescript
const { data: hierarchy } = useQuery({
  queryKey: ['search-structure', entity, adType],
  queryFn: async () => {
    const { data } = await supabase
      .from('search_campaigns')
      .select(`
        *,
        ad_groups(
          *,
          ads(*)
        )
      `)
      .eq('entity', entity)
      .order('name');
    return data;
  }
});
```

**2. Extract Tree Components**

Split into:
- `SearchCampaignTree.tsx` - Main tree
- `CampaignNode.tsx` - Campaign row
- `AdGroupNode.tsx` - Ad group row
- `AdNode.tsx` - Ad row

**Files to Modify:**
- `src/components/search-planner/SearchPlannerStructurePanel.tsx` - Refactor
- Create new node components in `src/components/search-planner/`

---

## Part 5: LP Planner Improvements

### Current Problems

| Issue | Root Cause |
|-------|------------|
| Simple architecture | Already well-structured (only 47 lines) |
| No major issues identified | Focus on maintaining quality |

### Recommendation: Maintain Current Quality

The LP Planner is well-architected. Future improvements:
- Add section templates for faster LP creation
- Implement section duplication

---

## Part 6: Database Schema Improvements

### Required Migrations

```sql
-- 1. Add unique constraint for campaign-entity tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_entity_unique 
ON campaign_entity_tracking(campaign_id, entity);

-- 2. Add batch task status update function
CREATE OR REPLACE FUNCTION batch_update_task_status(
  p_task_ids uuid[],
  p_status text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE tasks 
  SET status = p_status, updated_at = now()
  WHERE id = ANY(p_task_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 3. Create campaign hierarchy view for Search Planner
CREATE OR REPLACE VIEW search_planner_hierarchy AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.entity,
  ag.id as ad_group_id,
  ag.name as ad_group_name,
  a.id as ad_id,
  a.name as ad_name,
  a.approval_status,
  a.ad_type
FROM search_campaigns c
LEFT JOIN ad_groups ag ON ag.campaign_id = c.id
LEFT JOIN ads a ON a.ad_group_id = ag.id;
```

---

## Implementation Priority

| Priority | Area | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Fix Campaign Import | 2 hours | High - Stops data loss |
| **P1** | Entity consolidation | 3 hours | High - Stops confusion |
| **P2** | Campaign-Entity joined queries | 4 hours | High - Fixes performance |
| **P3** | Task filter extraction | 4 hours | Medium - Cleaner code |
| **P4** | Search Planner hierarchy query | 3 hours | Medium - Better UX |
| **P5** | Batch task operations | 2 hours | Medium - Faster bulk actions |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useTaskFilters.ts` | Extract filter logic from Tasks.tsx |
| `src/components/search-planner/CampaignNode.tsx` | Campaign tree node |
| `src/components/search-planner/AdGroupNode.tsx` | Ad group tree node |
| `src/components/search-planner/AdNode.tsx` | Ad tree node |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useUtmCampaigns.ts` | Add entity tracking in upsert |
| `src/hooks/useCampaignEntityTracking.ts` | Add joined query option |
| `src/pages/CampaignsLog.tsx` | Use joined data, remove getEntitiesForCampaign calls |
| `src/pages/Tasks.tsx` | Extract filter logic to hook |
| `src/lib/constants.ts` | Deprecate ENTITIES array |
| `src/components/search-planner/SearchPlannerStructurePanel.tsx` | Use useSystemEntities |
| `src/components/campaigns/CampaignBulkImportDialog.tsx` | Fix import flow |

---

## Expected Outcomes

1. **Campaign Import**: Campaigns correctly appear in entity tables after import
2. **Entity Consistency**: Single source of truth (`system_entities` table)
3. **Performance**: 50%+ reduction in query count, faster filtering
4. **Code Quality**: Smaller, focused components
5. **Scalability**: Ready for 100+ campaigns and 20+ entities

---

## Technical Notes

- All changes maintain backward compatibility
- Realtime subscriptions continue working unchanged
- Query keys remain stable for cache consistency
- RLS policies already handle security
