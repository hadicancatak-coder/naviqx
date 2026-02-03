
# Campaign Log UI Simplification Plan

## Problems to Address

### 1. Cramped/Overlapping Version Detail Panel
The current architecture puts the expanded `VersionDetailPanel` inside a table row (`<td colSpan={6}`), which is constrained by:
- Fixed `h-[600px]` ScrollArea height in `CampaignTable`
- Table cell layout constraints that don't allow flex content to expand properly
- Content fighting for space inside a rigid table structure

### 2. Overcomplicated URL Structure
Current: `/campaigns-log/review/55248d1f-d576-4fa7-bee3-9b13e3580668`
Too verbose with `/campaigns-log/review/` prefix.

---

## Proposed Solution

### Part 1: Redesign Campaign Detail as a Slide-Out Sheet (Primary Fix)

Replace the inline table expansion with a **right-side Sheet/Drawer** pattern:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ CAMPAIGN LOG (full width table)                              │ SHEET PANEL │
│ ┌────────────────────────────────────────────────────────────┐│            │
│ │ Campaign 1  │ Entities │ Versions (3) │ Actions │          ││  Campaign  │
│ │ Campaign 2  │ Entities │ Versions (2) │ Actions │ ◀ click  ││  Details + │
│ │ Campaign 3  │ Entities │ Versions (1) │ Actions │          ││  Versions  │
│ └────────────────────────────────────────────────────────────┘│  Comments  │
└────────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Full vertical height for detail panel
- Comments section gets proper space
- Table stays clean and scannable
- Follows the same pattern as Task detail sheets in the app

**Implementation:**
1. Create `CampaignDetailSheet.tsx` - A Sheet component that opens when clicking a campaign row
2. Shows campaign metadata, all versions in a list, and comments for selected version
3. Remove inline expansion from `CampaignRow` and `VersionSubRow`
4. Keep the table simple: just rows with click-to-open behavior

### Part 2: Simplify External Review URL Structure

**Current:** `/campaigns-log/review/:token`  
**Proposed:** `/review/:token`

This is cleaner and more shareable. Implementation:
1. Add new route `/review/:token` in `App.tsx` pointing to same `CampaignReview` component
2. Keep old route as redirect for backward compatibility
3. Update `CampaignShareDialog` and `useExternalAccess` to generate shorter URLs

---

## Technical Changes

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/campaigns/CampaignDetailSheet.tsx` | Full-height slide-out panel for campaign + versions |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/campaigns/CampaignTable.tsx` | Remove fixed height, simplify to basic table |
| `src/components/campaigns/CampaignRow.tsx` | Remove inline expansion, add sheet trigger |
| `src/App.tsx` | Add `/review/:token` route |
| `src/components/campaigns/CampaignShareDialog.tsx` | Update URL generation |
| `src/hooks/useExternalAccess.ts` | Update URL generation |
| `src/contexts/AuthContext.tsx` | Add `/review/` to public access check |

### Files to Delete (Optional Cleanup)
| File | Reason |
|------|--------|
| `src/components/campaigns/VersionSubRow.tsx` | Replaced by sheet-based version list |
| `src/components/campaigns/VersionDetailPanel.tsx` | Content moves into sheet |

---

## UI Layout in New Sheet

```text
┌──────────────────────────────────────────────────┐
│ [X] Campaign Name                      [Edit] ▼  │ Header
├──────────────────────────────────────────────────┤
│ Landing Page: https://...  [Open] [Copy]         │
│ Type: Display  •  Entity: UAE                    │
│ Description: Campaign description text...        │
├──────────────────────────────────────────────────┤
│ VERSIONS                                         │
│ ┌──────────────────────────────────────────────┐ │
│ │ [Image] V3 - Jan 15, 2026   [Active]  ▸      │ │
│ │ [Image] V2 - Jan 10, 2026            ▸      │ │
│ │ [Image] V1 - Jan 5, 2026             ▸      │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ VERSION 3 DETAILS                                │
│ [Large Image Preview - 400px]                    │
│ Notes: "Final approved version for launch"       │
│ Created by: John Smith • Jan 15, 2026           │
├──────────────────────────────────────────────────┤
│ COMMENTS (5)                              [+Add] │
│ ┌──────────────────────────────────────────────┐ │
│ │ Sarah: Great work on this version!           │ │
│ │ [External] Client: Approved, ready to go     │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## URL Changes Summary

| Old URL | New URL | Status |
|---------|---------|--------|
| `/campaigns-log/review/:token` | `/review/:token` | New primary |
| `/campaigns-log/external/:token` | Redirect to `/review/:token` | Deprecated |

---

## Migration Strategy

1. **Phase 1**: Create new `CampaignDetailSheet` component with full functionality
2. **Phase 2**: Update `CampaignRow` to open sheet instead of inline expand
3. **Phase 3**: Remove unused components (`VersionSubRow`, `VersionDetailPanel`)
4. **Phase 4**: Add new `/review/:token` route and update URL generation
5. **Phase 5**: Test both internal and external flows

This approach gives maximum space utilization while maintaining the quick-scan ability of the table view.
