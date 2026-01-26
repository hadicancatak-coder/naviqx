

# Unified Comment System & External Feedback Fix

## Problem Summary

1. **External feedback submission fails** - The RLS policy for `external_campaign_review_comments` INSERT requires the `access_token` to exist in `campaign_external_access` with `is_active = true`, but the token check may be failing for anon users
2. **Date display inconsistency** - Some comment displays only show relative time ("2 hours ago"), not actual dates
3. **7 fragmented comment tables** - Creates maintenance burden and inconsistent patterns:
   - `comments` (task comments - **DO NOT TOUCH**)
   - `entity_comments`
   - `campaign_comments`
   - `utm_campaign_comments`
   - `utm_campaign_version_comments`
   - `external_campaign_review_comments`
   - `lp_external_comments`

---

## Phase 1: Fix External Feedback Submission (Immediate)

### Root Cause
The RLS policy check requires matching the access_token in `campaign_external_access`, but the anon role may not have proper SELECT access to verify the token exists.

### Database Migration

```sql
-- Ensure anon users can verify token exists for INSERT policy
CREATE POLICY "Anon can verify tokens for comments"
ON public.campaign_external_access
FOR SELECT
TO anon
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Simplify INSERT policy for external comments
DROP POLICY IF EXISTS "Public can comment via valid token" ON public.external_campaign_review_comments;

CREATE POLICY "Anyone with valid token can insert comments"
ON public.external_campaign_review_comments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  reviewer_email IS NOT NULL 
  AND reviewer_name IS NOT NULL 
  AND access_token IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM campaign_external_access
    WHERE campaign_external_access.access_token = external_campaign_review_comments.access_token
    AND campaign_external_access.is_active = true
    AND (campaign_external_access.expires_at IS NULL OR campaign_external_access.expires_at > now())
  )
);
```

---

## Phase 2: Add Dates to All Comment Displays

Update all comment display components to show actual dates alongside relative time.

### Files to Update

| File | Current Display | New Display |
|------|-----------------|-------------|
| `src/pages/CampaignReview.tsx` | `formatDistanceToNow(...)` only | Add actual date: "Jan 26, 2:30 PM (2 hours ago)" |
| `src/components/campaigns/VersionComments.tsx` | `formatDistanceToNow(...)` only | Add actual date |
| `src/components/campaigns/CampaignComments.tsx` | `formatDistanceToNow(...)` only | Add actual date |
| `src/components/campaigns/ExternalReviewComments.tsx` | `formatDistanceToNow(...)` only | Add actual date |

### Date Format Pattern
Use the same format as task comments (`TaskDetailActivity.tsx` line 102):
```typescript
import { format } from "date-fns";

// Display pattern: "Jan 26, 2:30 PM"
format(new Date(comment.created_at), "MMM d, h:mm a")
```

---

## Phase 3: Future - Unified Comment System (Not in This Sprint)

**Important**: Task comments (`comments` table) work perfectly and will NOT be modified.

### Long-term Consolidation Strategy (for future consideration)

Create a single `unified_comments` table that can handle all contexts:

```sql
CREATE TABLE unified_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Context type: 'task', 'campaign', 'version', 'entity', 'lp_map', 'lp_section'
  context_type TEXT NOT NULL,
  -- Flexible foreign keys (only one will be set based on context)
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES utm_campaigns(id) ON DELETE CASCADE,
  version_id UUID REFERENCES utm_campaign_versions(id) ON DELETE CASCADE,
  entity TEXT,
  lp_map_id UUID REFERENCES lp_maps(id) ON DELETE CASCADE,
  lp_section_id UUID REFERENCES lp_sections(id) ON DELETE CASCADE,
  -- Author info
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  author_email TEXT,
  -- Content
  comment_text TEXT NOT NULL,
  -- External review tracking
  is_external BOOLEAN DEFAULT false,
  access_token TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**This consolidation is OUT OF SCOPE for now** - we will only fix the immediate issues.

---

## Implementation Summary

| Priority | Task | Risk Level |
|----------|------|------------|
| 1. CRITICAL | Fix RLS policy for external comment INSERT | Low - additive policy |
| 2. HIGH | Add actual dates to all comment displays | Low - UI only |
| 3. DEFERRED | Unified comment system | High - requires migration |

---

## Files to Modify

| File | Changes |
|------|---------|
| New Supabase Migration | Fix RLS policies for `external_campaign_review_comments` INSERT |
| `src/pages/CampaignReview.tsx` | Add actual date display alongside relative time |
| `src/components/campaigns/VersionComments.tsx` | Add actual date display |
| `src/components/campaigns/CampaignComments.tsx` | Add actual date display |
| `src/components/campaigns/ExternalReviewComments.tsx` | Add actual date display |

---

## Testing Checklist

1. External reviewer can submit entity-level feedback (campaign_id IS NULL)
2. External reviewer can submit version-specific feedback
3. All comments show "Jan 26, 2:30 PM (2 hours ago)" format
4. Task comments continue to work exactly as before
5. Internal users can still add comments to campaigns/versions

