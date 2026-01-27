
# External Review Page - Layout Expansion Plan

## Problem Analysis

The current layout has these issues:

1. **Narrow grid columns**: Cards are in a `grid-cols-4` layout, so when expanded, the version gallery is crammed into ~25% of the screen width
2. **Nested content**: The `ExternalVersionGallery` with its side-by-side image + comments layout is inside the card, but has no room to breathe
3. **Wasted space**: 75% of the screen is empty when viewing campaign details
4. **Not scalable**: With many campaigns, the narrow cards don't show enough detail

## Proposed Solution: Master-Detail Layout

When a campaign is expanded, it should break out of the grid and display in a full-width detail panel below the grid header. This is the iOS-style "selected item" pattern.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header: Campaign Review • Entity • Badge                            │
├─────────────────────────────────────────────────────────────────────┤
│  [Search] [Grid/List] [Sort]                       [X campaigns]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ Card │  │ Card │  │ Card │  │ Card │  │ Card │  │ Card │        │
│  │  1   │  │  2   │  │ GOLD │  │  4   │  │  5   │  │  6   │        │
│  │      │  │      │  │(sel) │  │      │  │      │  │      │        │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    EXPANDED DETAIL PANEL                        ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │ Campaign Name: Gold                    [LP] [Close X]       │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │                                                                  ││
│  │  Version Tabs: [v1] [v2] [v3]                                   ││
│  │                                                                  ││
│  │  ┌──────────────────────────┐  ┌───────────────────────────────┐││
│  │  │                          │  │ Feedback (2)                  │││
│  │  │      Large Preview       │  │ ┌──────────────────────────┐  │││
│  │  │        (500px+)          │  │ │ User: "TEST AHA"         │  │││
│  │  │                          │  │ └──────────────────────────┘  │││
│  │  │                          │  │ ┌──────────────────────────┐  │││
│  │  │                          │  │ │ User: "Another comment"  │  │││
│  │  │                          │  │ └──────────────────────────┘  │││
│  │  │   Click to expand        │  │                               │││
│  │  │                          │  │ Add Feedback                  │││
│  │  │                          │  │ [                          ]  │││
│  │  │                          │  │ [Submit Feedback]             │││
│  │  └──────────────────────────┘  └───────────────────────────────┘││
│  │  Jan 22, 11:21 AM • "January 26 version - USPs"                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  General Feedback for Entity                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Footer: © 2025 Naviqx                                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### Step 1: Modify ExternalCampaignCard
- **Remove** the `CollapsibleContent` from inside the card
- Card becomes a simple clickable thumbnail that sets `expandedCampaignId`
- Selected card gets a visual indicator (ring, glow, or checkmark)

### Step 2: Create ExternalCampaignDetailPanel Component
New component that renders the full-width detail view:
- Header with campaign name, LP link, and close button
- Full-width `ExternalVersionGallery` with proper breathing room
- Appears BELOW the entire grid when a campaign is selected

### Step 3: Update CampaignReview.tsx Layout
```tsx
{/* Campaign Grid - always visible */}
<ExternalCampaignGrid
  campaigns={sortedCampaigns}
  versions={versions}
  comments={existingComments}
  expandedCampaignId={expandedCampaignId}
  onToggleExpand={(id) => setExpandedCampaignId(prev => prev === id ? null : id)}
/>

{/* Detail Panel - appears when campaign selected */}
{expandedCampaignId && (
  <ExternalCampaignDetailPanel
    campaign={sortedCampaigns.find(c => c.id === expandedCampaignId)}
    versions={versions.filter(v => v.utm_campaign_id === expandedCampaignId)}
    comments={existingComments}
    onClose={() => setExpandedCampaignId(null)}
    onSubmitFeedback={handleCommentSubmit}
    submitting={submitting}
    commentInputs={comments}
    onCommentChange={(vId, val) => setComments({...comments, [vId]: val})}
  />
)}
```

### Step 4: Improve Grid Responsiveness
- Keep the 4-column grid for campaign overview
- Make cards more compact (smaller thumbnails: aspect-[3/2] instead of [4/3])
- Show campaign name, version count, comment count prominently
- Remove expanded content from cards entirely

### Step 5: Update ExternalVersionGallery for Detail Panel
- Increase image max height from 400px to 500px+
- Use full width for the 2-column layout (image left, comments right)
- Add more padding and breathing room

## Files to Modify

| File | Change |
|------|--------|
| `src/components/campaigns/ExternalCampaignCard.tsx` | Remove Collapsible expand, make it selection-only with visual indicator |
| `src/components/campaigns/ExternalCampaignGrid.tsx` | Minor styling updates, pass selection state |
| `src/components/campaigns/ExternalCampaignDetailPanel.tsx` | **Create new** - full-width detail panel with header and close button |
| `src/pages/CampaignReview.tsx` | Restructure layout to show grid + detail panel below |
| `src/components/campaigns/ExternalVersionGallery.tsx` | Increase image sizes and spacing for detail panel context |

## Benefits

1. **Full width for details**: When viewing a campaign, the image and feedback get proper space
2. **Grid stays visible**: Users can still see all campaigns while one is expanded
3. **Scalable**: Works well with 1 or 100 campaigns
4. **Better UX**: Matches familiar patterns (iOS Photos, Finder, etc.)
5. **Guide texts preserved**: All feedback forms and instructions remain intact
