

## Unified External Access System

### Problem Statement

The current external/public page system is fragmented across 4+ implementations with:
- 3 different ways to store public tokens (dedicated table vs column on entity)
- 2 different external comment tables with nearly identical schemas
- Duplicated verification, session, and click-tracking logic in each page
- No unified management - admins must check multiple places

### Solution: Single Unified System

Create **one external access system** that works for ALL features:
- Campaigns Log
- Knowledge Pages  
- Projects
- LP Planner
- Search Planner (new)

---

## Database Architecture

### 1. Unified Access Table: `public_access_links`

Single table for ALL external access tokens:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| access_token | text | Unique URL token |
| resource_type | text | 'campaign', 'knowledge', 'project', 'lp_map', 'search_ads' |
| resource_id | uuid | NULL for entity-wide access |
| entity | text | Entity filter (UAE, KSA, etc.) |
| reviewer_name | text | Optional pre-filled name |
| reviewer_email | text | Optional pre-filled email |
| email_verified | boolean | Whether identity confirmed |
| expires_at | timestamptz | Optional expiration |
| is_active | boolean | Link active status |
| is_public | boolean | Whether publicly accessible without verification |
| created_by | uuid | User who created link |
| created_at | timestamptz | Creation time |
| click_count | integer | Access tracking |
| last_accessed_at | timestamptz | Last access time |
| metadata | jsonb | Flexible extra data per resource type |

**Unique Index**: `(access_token)` + partial index on `(entity, resource_type)` where `is_active = true`

### 2. Unified Comments Table: `public_access_comments`

Single table for ALL external feedback:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| access_link_id | uuid | FK to public_access_links |
| resource_type | text | Match parent |
| resource_id | uuid | Specific item being commented on (campaign, ad, section, etc.) |
| parent_id | uuid | For threaded comments (optional) |
| reviewer_name | text | Commenter name |
| reviewer_email | text | Commenter email |
| comment_text | text | The feedback |
| comment_type | text | 'general', 'entity_feedback', 'version_feedback', etc. |
| metadata | jsonb | Extra context (ad_id, version_id, section_id, etc.) |
| created_at | timestamptz | Timestamp |

**RLS**: Allow anonymous INSERT if valid access_token provided, SELECT if token matches

---

## Core Hook: `usePublicAccess`

Single hook replaces `useExternalAccess`, `useLpMapByToken`, etc:

```typescript
interface UsePublicAccessOptions {
  token: string;
  resourceType: 'campaign' | 'knowledge' | 'project' | 'lp_map' | 'search_ads';
}

export function usePublicAccess({ token, resourceType }: UsePublicAccessOptions) {
  // Token verification
  // Click tracking
  // Resource data fetching
  // Comment fetching/submission
  // Session management via useReviewerSession
  
  return {
    accessData,      // Access link info
    resourceData,    // The actual content (campaigns, pages, ads, etc.)
    comments,        // All comments for this access
    isLoading,
    error,
    isIdentified,
    submitComment,   // Unified comment submission
    identify,        // Reviewer identification
  };
}
```

---

## Unified Public Page Component

### `ExternalReviewPage.tsx` (New Shared Shell)

A single wrapper component that handles:
1. Token verification
2. Loading/error states
3. Header with identification bar
4. Footer (ExternalPageFooter)
5. Glass background

Child components render the resource-specific content:

```typescript
<ExternalReviewPage token={token} resourceType="campaign">
  {(data, comments, actions) => (
    <CampaignReviewContent 
      campaigns={data.campaigns} 
      comments={comments}
      onComment={actions.submitComment}
    />
  )}
</ExternalReviewPage>
```

This eliminates 500+ lines of duplicated boilerplate across pages.

---

## Resource-Specific Content Components

Keep these lean - just the rendering logic:

| Component | Purpose |
|-----------|---------|
| `CampaignReviewContent` | Grid of campaign cards with version gallery |
| `KnowledgeReviewContent` | Rendered knowledge page content |
| `ProjectReviewContent` | Project roadmap timeline |
| `LpMapReviewContent` | LP sections with images |
| `SearchAdsReviewContent` | Campaign hierarchy with ad previews |

---

## Admin Management: Enhanced `ExternalLinksManagement`

Update to query single `public_access_links` table with `resource_type` filter tabs:

- All Links (default)
- Campaigns
- Knowledge
- Projects
- LP Planner
- Search Ads

Actions per link:
- Toggle active
- Extend expiration
- View click stats
- Delete

---

## Migration Path

### Phase 1: Create New Tables
- `public_access_links` with RLS
- `public_access_comments` with RLS

### Phase 2: Data Migration (SQL)
```sql
-- Migrate campaign_external_access
INSERT INTO public_access_links (access_token, resource_type, resource_id, entity, ...)
SELECT access_token, 'campaign', campaign_id, entity, ...
FROM campaign_external_access;

-- Migrate lp_maps tokens
INSERT INTO public_access_links (access_token, resource_type, resource_id, ...)
SELECT public_token, 'lp_map', id, ...
FROM lp_maps WHERE public_token IS NOT NULL;

-- Similar for knowledge_pages, projects
```

### Phase 3: Create Hook & Components
- `usePublicAccess.ts`
- `ExternalReviewPage.tsx`
- Resource content components

### Phase 4: Update Routes
- Keep existing URLs for backward compatibility
- All point to unified page with different resourceType

### Phase 5: Cleanup (Later)
- Remove old tables after validation
- Remove old hooks and components

---

## File Structure

```text
src/
├── hooks/
│   └── usePublicAccess.ts              # Unified access hook
├── components/
│   └── external/                        # New folder
│       ├── ExternalReviewPage.tsx       # Shared shell
│       ├── ExternalReviewHeader.tsx     # Header with ID bar
│       ├── ExternalCommentForm.tsx      # Unified comment input
│       ├── ExternalCommentFeed.tsx      # Comment display
│       ├── CampaignReviewContent.tsx    # Campaign-specific
│       ├── KnowledgeReviewContent.tsx   # Knowledge-specific
│       ├── ProjectReviewContent.tsx     # Project-specific
│       ├── LpMapReviewContent.tsx       # LP-specific
│       └── SearchAdsReviewContent.tsx   # Search ads-specific
├── pages/
│   └── PublicReview.tsx                 # Single page, routes by type
```

---

## Technical Benefits

1. **Single source of truth**: One table for all access tokens
2. **Unified RLS**: One set of policies to maintain
3. **Consistent admin view**: All links in one place
4. **Less code**: ~2000 lines removed, ~500 lines added
5. **Easy to extend**: Add new resource types without new tables/hooks
6. **Search Planner support**: Just add content component

---

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| **Database Migration** | - | Create `public_access_links` and `public_access_comments` |
| **Create** | `src/hooks/usePublicAccess.ts` | Unified access hook |
| **Create** | `src/components/external/ExternalReviewPage.tsx` | Shared shell |
| **Create** | `src/components/external/ExternalReviewHeader.tsx` | Header component |
| **Create** | `src/components/external/ExternalCommentForm.tsx` | Comment input |
| **Create** | `src/components/external/ExternalCommentFeed.tsx` | Comment display |
| **Create** | `src/components/external/CampaignReviewContent.tsx` | Campaign content |
| **Create** | `src/components/external/SearchAdsReviewContent.tsx` | Search ads content |
| **Create** | `src/pages/PublicReview.tsx` | Unified public page |
| **Modify** | `src/App.tsx` | Update routes to use PublicReview |
| **Modify** | `src/pages/admin/ExternalLinksManagement.tsx` | Query unified table |
| **Modify** | `src/components/campaigns/CampaignShareDialog.tsx` | Use new hook |
| **Keep** | `src/hooks/useReviewerSession.ts` | Already reusable |

---

## Implementation Order

1. ✅ Database migration (create new tables)
2. ✅ `usePublicAccess` hook
3. ✅ `ExternalReviewPage` shell component
4. ✅ `SearchAdsReviewContent` (the new feature)
5. ✅ Update routes for search ads
6. Migrate existing pages one at a time (campaigns → LP → knowledge → projects)
7. Update admin management
8. Data migration SQL
9. Cleanup old code

## Completed Components

- `src/hooks/usePublicAccess.ts` - Unified access hook
- `src/components/external/ExternalReviewPage.tsx` - Shared shell
- `src/components/external/ExternalReviewHeader.tsx` - Header with ID form
- `src/components/external/ExternalCommentForm.tsx` - Comment input
- `src/components/external/ExternalCommentFeed.tsx` - Comment display
- `src/components/external/SearchAdsReviewContent.tsx` - Search ads content
- `src/pages/PublicReview.tsx` - Unified public page

## Route Added

`/ads/search/review/:token` - Search Ads external review

