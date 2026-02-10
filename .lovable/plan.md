
# Google Planner: CFI Logo in Previews + UI Polish

## 1. Add CFI Emblem Logo to Previews

The uploaded CFI emblem (red square logo) will be copied to `src/assets/cfi-logo-emblem.png` and used across ALL preview renderers in `PreviewAssemblyEngine.tsx` and `SearchPlannerPreviewPanel.tsx` -- replacing the generic letter-initial placeholders.

**Affected preview components:**
- **AppSearchPreview**: Replace the letter-in-circle with the CFI emblem as the app icon
- **PlayStorePreview**: Replace the letter-in-square with the emblem
- **YouTubePreview**: Add CFI logo next to business name in footer
- **NativePreview**: Add small CFI logo next to the "Ad" badge
- **BannerPreview**: Add CFI logo on the left side
- **GmailPreview**: Replace the letter avatar with the CFI emblem
- **SearchAdPreviewPanel** (Search SERP): Add CFI favicon next to the display URL

All previews will import the emblem via `import cfiEmblem from "@/assets/cfi-logo-emblem.png"` for consistent branding.

## 2. Preview UI Polish

Current previews look flat and minimal. Changes:

- **Better card shadows and depth**: Add subtle `shadow-md` and `ring-1 ring-border` to preview cards for more realistic Google-style framing
- **Device frame simulation**: Add a thin device-like border wrapper around mobile previews (rounded corners, subtle bezel effect)
- **Improved image placeholders**: Replace the plain gray boxes with a subtle gradient + dashed border + icon treatment
- **Search SERP preview polish**: Add a fake Google search bar above the ad result for context (gray rounded input with search icon), making it feel like an actual SERP
- **Play Store preview**: Add a more realistic store listing feel -- star rating row, download count, category tag
- **YouTube preview**: Add the classic red YouTube play button overlay, channel avatar in corner
- **Gmail preview**: Add inbox-style row context (checkbox, star icon, time) for realism
- **Banner preview**: Add "Advertisement" label, more realistic sizing

## 3. Bulk Actions Enhancement

The existing `SearchPlannerBulkBar` already supports Delete, Duplicate, Export, and Status changes. It's already wired into the structure panel. Enhancements:

- **"Pause All" quick action**: One-click to set all selected campaigns to paused
- **Bulk type change**: Allow changing campaign_type for selected campaigns (Search/Display/App)
- **Selection count badge**: Show affected ad groups + ads count inline (already computed but not displayed prominently)
- **Better styling**: Follow the floating card standard with `liquid-glass-elevated` instead of solid `bg-primary`

## Technical Details

### Files Changed

| File | Change |
|------|--------|
| `src/assets/cfi-logo-emblem.png` | Copy uploaded CFI emblem image |
| `src/components/search-planner/PreviewAssemblyEngine.tsx` | Import CFI emblem, use in all placement renderers, improve placeholder styling, add contextual frames |
| `src/components/search-planner/SearchPlannerPreviewPanel.tsx` | Import CFI emblem, add to search SERP preview, add fake search bar context |
| `src/components/search-planner/SearchPlannerBulkBar.tsx` | Update styling to `liquid-glass-elevated`, add bulk type change, improve count display |

### No database changes required.
