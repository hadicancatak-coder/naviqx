

# Universal Token Resolver - COMPLETED ✅

### Overview
Add a universal token resolver that auto-detects the resource type from any token, allowing a single URL pattern `/r/:token` to work for all resource types. This eliminates the need for users to remember resource-specific URL prefixes.

---

### Architecture

The solution creates a new `UniversalReview` page that:
1. Accepts any token via `/r/:token`
2. Queries `public_access_links` by token only (no resource_type filter)
3. Extracts the `resource_type` from the database record
4. Passes the resolved type to the existing `PublicReview` component

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Universal Token Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User visits: /r/abc123xyz                                      │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────┐                                       │
│  │  UniversalReview    │                                       │
│  │  (new component)    │                                       │
│  └──────────┬──────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  Query: SELECT resource_type FROM public_access_links │       │
│  │         WHERE access_token = 'abc123xyz'              │       │
│  └─────────────────────────────────────────────────────┘       │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────┐                                       │
│  │  Resolved Type:     │                                       │
│  │  "search_ads"       │                                       │
│  └──────────┬──────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌─────────────────────┐                                       │
│  │  PublicReview       │ ◄── Existing unified component         │
│  │  resourceType=      │                                       │
│  │  "search_ads"       │                                       │
│  └─────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Implementation Steps

**Step 1: Create Token Resolution Hook**
Create `useTokenResolver` hook in `src/hooks/useTokenResolver.ts`:
- Query `public_access_links` by `access_token` only
- Return `resource_type`, `is_active`, and expiration status
- Handle loading and error states

**Step 2: Create Universal Review Page**
Create `src/pages/UniversalReview.tsx`:
- Use `useTokenResolver` to auto-detect resource type
- Render `PublicReview` with resolved `resourceType`
- Show loading skeleton during resolution
- Display appropriate error for invalid/expired tokens

**Step 3: Register Universal Route**
Update `src/App.tsx`:
- Add route: `/r/:token` for the universal resolver
- Keep existing resource-specific routes for backward compatibility

**Step 4: Update Share Dialogs to Use Universal URL**
Update all share dialogs to generate universal URLs:
- `SearchAdsShareDialog.tsx`: `/r/:token`
- `LpMapShareDialog.tsx`: `/r/:token`
- `CampaignShareDialogUnified.tsx`: `/r/:token`
- `KnowledgeShareDialog.tsx`: `/r/:token`
- `ProjectShareDialog.tsx`: `/r/:token`

**Step 5: Update URL Helper**
Add a utility function in `src/lib/urlHelpers.ts`:
```typescript
export const getUniversalReviewUrl = (token: string): string => {
  return `${getProductionUrl()}/r/${token}`;
};
```

---

### Benefits
- **Simpler URLs**: `/r/abc123` instead of `/campaigns/review/abc123`
- **Future-proof**: New resource types work automatically
- **Backward compatible**: Existing resource-specific URLs still function
- **Single source of truth**: Resource type determined by database, not URL

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useTokenResolver.ts` | Create |
| `src/pages/UniversalReview.tsx` | Create |
| `src/App.tsx` | Add `/r/:token` route |
| `src/lib/urlHelpers.ts` | Add `getUniversalReviewUrl` |
| `src/components/search/SearchAdsShareDialog.tsx` | Use universal URL |
| `src/components/lp-planner/LpMapShareDialog.tsx` | Use universal URL |
| `src/components/campaigns/CampaignShareDialogUnified.tsx` | Use universal URL |
| `src/components/knowledge/KnowledgeShareDialog.tsx` | Use universal URL |
| `src/components/projects/ProjectShareDialog.tsx` | Use universal URL |

---

### Technical Details

**Token Resolution Query:**
```sql
SELECT resource_type, is_active, expires_at
FROM public_access_links
WHERE access_token = $token
LIMIT 1
```

**Error Handling:**
- No token found: "Invalid access link"
- Token inactive: "This link has been deactivated"
- Token expired: "This access link has expired"

**Performance:**
- Single lightweight query (just 3 columns)
- Cached with React Query (5 min stale time)
- No additional database load after resolution

