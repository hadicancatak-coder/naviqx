
# External Campaign Review - Board View Redesign

## Current State Analysis

After exploring the codebase, I've identified the following issues with the external campaign review experience:

### Current External Pages:
| Page | Route | Current UI | Issues |
|------|-------|------------|--------|
| `CampaignReview.tsx` | `/campaigns-log/review/:token` | Vertical accordion list | Small thumbnails (120x90px), nested accordions are confusing, hidden versions |
| `CampaignsLogExternal.tsx` | `/campaigns-log/external/:token` | Grid of small cards (EntityCampaignTable) | Uses same small grid as internal, dialog-based viewing, not review-focused |

### Key UX Problems:
1. **No visual board view** - External reviewers see a cramped vertical list with tiny thumbnails
2. **Campaigns hidden behind accordions** - Users must click to expand each version
3. **Small creative images** - 120x90px thumbnails are too small for creative review
4. **Dialog-based viewing** - Clicking opens a modal instead of showing content inline
5. **Fragmented experience** - Two separate external pages with different patterns
6. **No side-by-side comparison** - Can't compare versions easily

### What Internal Users Have (that external reviewers don't):
- Grid/board layout with larger cards
- List view toggle
- Drag-and-drop (not needed for external)
- Full UtmCampaignDetailDialog with inline version cards

---

## Proposed Solution: Sales-Friendly Board View

### Design Philosophy
Create a purpose-built external review experience that prioritizes:
1. **Large visuals** - Creatives should be the focus
2. **At-a-glance overview** - See all campaigns in a grid/board format
3. **Easy feedback** - Comment directly on what you see
4. **Mobile-friendly** - Sales teams are often on mobile

---

## Phase 1: Redesign CampaignReview.tsx

### New Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Campaign Review - [Entity] • Reviewing as [Name]        │
├─────────────────────────────────────────────────────────────────┤
│ FILTER BAR: [View Mode: Grid | List] [Sort: Latest | Name]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  [CREATIVE]  │  │  [CREATIVE]  │  │  [CREATIVE]  │           │
│  │  300x225px   │  │  300x225px   │  │  300x225px   │           │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤           │
│  │ Campaign Name│  │ Campaign Name│  │ Campaign Name│           │
│  │ v3 • Latest  │  │ v1 • Latest  │  │ v2 • Latest  │           │
│  │ [💬 3]       │  │ [💬 0]       │  │ [💬 1]       │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  (click to expand inline details)                                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ ENTITY FEEDBACK SECTION (sticky/accessible)                     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Changes

1. **Grid Layout by Default**
   - 3-4 columns on desktop, 2 on tablet, 1 on mobile
   - Large campaign cards with 300x225px thumbnails
   - Show latest version image prominently

2. **Campaign Card Redesign**
   - Large creative thumbnail (not 120x90px)
   - Campaign name + type badge
   - Version count indicator
   - Comment count badge
   - Hover effect with "View Details" overlay

3. **Inline Expansion (not dialog)**
   - Clicking a card expands it inline to show:
     - Full version gallery with larger images
     - Version timeline with notes
     - Comment section per version
   - Uses Collapsible/Accordion pattern for smooth UX

4. **View Mode Toggle**
   - **Grid view**: Visual board layout (default)
   - **List view**: Dense table for quick scanning

5. **Mobile Optimization**
   - Single column layout on mobile
   - Swipeable version gallery
   - Floating feedback button

---

## Phase 2: New External Campaign Card Component

Create `ExternalCampaignCard.tsx` - purpose-built for review:

```typescript
interface ExternalCampaignCardProps {
  campaign: Campaign;
  versions: Version[];
  comments: Comment[];
  onExpand: () => void;
  isExpanded: boolean;
  onSubmitFeedback: (versionId: string, text: string) => void;
}
```

Features:
- Larger thumbnail (aspect-video, ~300x225px)
- Version indicator badge
- Comment count
- Click-to-expand behavior
- Inline version gallery when expanded
- Per-version comment form

---

## Phase 3: Consolidate External Pages

Currently there are two external pages:
- `CampaignReview.tsx` - Main external review
- `CampaignsLogExternal.tsx` - Alternative external view

**Recommendation**: Deprecate `CampaignsLogExternal.tsx` and route all external traffic to the improved `CampaignReview.tsx`.

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/campaigns/ExternalCampaignCard.tsx` | Visual card for external review |
| `src/components/campaigns/ExternalCampaignGrid.tsx` | Grid layout for campaign cards |
| `src/components/campaigns/ExternalVersionGallery.tsx` | Inline version gallery with lightbox |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CampaignReview.tsx` | Replace accordion list with grid layout, add view toggle |
| `src/pages/CampaignsLogExternal.tsx` | Redirect to CampaignReview or deprecate |

### Component Hierarchy

```
CampaignReview (page)
├── Header (sticky, glass)
├── FilterBar (view toggle, sort)
├── ExternalCampaignGrid
│   └── ExternalCampaignCard (multiple)
│       ├── Thumbnail (large)
│       ├── Meta (name, type, version count)
│       └── Collapsible
│           └── ExternalVersionGallery
│               ├── Version images with lightbox
│               ├── Version notes
│               └── VersionCommentForm
└── EntityFeedbackSection (existing)
```

---

## UI/UX Specifications

### Card Dimensions
- **Desktop**: 3-4 column grid, cards ~320px wide
- **Tablet**: 2 column grid
- **Mobile**: 1 column, full width

### Thumbnail Size
- Current: 120x90px (too small)
- New: 300x225px (16:12 ratio) or aspect-video

### Color Tokens (Prisma Design System)
- Card: `bg-card border-border`
- Hover: `hover:bg-card-hover hover:shadow-soft`
- Interactive: `transition-smooth cursor-pointer`
- Version badge: `bg-muted text-muted-foreground`
- Comment badge: `bg-primary/10 text-primary`

### Animations
- Card hover: `hover-lift` (translateY(-2px) + shadow)
- Expansion: `animate-accordion-down`
- Image lightbox: existing `ImageLightbox` component

---

## Summary

| Before | After |
|--------|-------|
| Tiny 120x90px thumbnails | Large 300x225px creatives |
| Vertical accordion list | Visual grid/board layout |
| Dialog-based viewing | Inline expansion |
| Hidden versions | Latest version prominent |
| No comparison | Side-by-side in grid |
| Desktop-only design | Mobile-first responsive |

This redesign transforms the external review experience from a "cramped list" to a "visual collaboration board" that sales teams can quickly scan and provide feedback on.
