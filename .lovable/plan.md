
## Scope (keeping your current plan + fixing the missed issues)

I reviewed the App Store Planner end-to-end (editor, previews, sharing flow, external review, and admin external-links management). The previous visual plan is a good base, but there are still functional gaps that explain your frustration. This implementation plan keeps the existing preview direction and adds the missing reliability + product-quality fixes.

## What I found (root causes)

1. **Full description is still not viewable**
   - Apple and Google previews still use `line-clamp-*`.
   - Apple has a static “more” button that does nothing.
   - Result: long content cannot be properly reviewed.

2. **External link flow is only partially wired**
   - Backend side is ready (`app_store` enum exists; anon read policy exists for token-based listing access).
   - Frontend dialog has state/query issues:
     - `AppStoreShareDialog` checks active links with query key `['public-access-link', 'app_store', listingId]`
     - `generateLink`/`toggleActive` only invalidate `['public-access-links']`, so dialog can look stale after actions.
   - `usePublicAccessManagement.generateLink` does not deactivate existing resource-specific active links (`resource_id` path), so duplicate active links can be created.
   - URL helper inconsistency: review links are forced to production domain in places, which can make verification look “broken” in preview/testing.

3. **Editor autosave has a data-loss risk**
   - One global debounce timer sends only the last changed field payload.
   - If user edits field A then field B quickly, field A can be dropped before save.
   - Last pending edits are cleared on unmount without guaranteed flush.

4. **Completeness score has logic mismatch**
   - Google completeness includes `secondary_category`, but Google editor currently doesn’t expose that field.
   - Score can be misleading.

5. **Admin external links page is not fully updated for `app_store`**
   - Type badge config, filter tabs, and stats omit `app_store`.
   - Risk of broken rendering/visibility when app_store links exist.

## Implementation plan (sequenced)

### Phase 1 — Fix data integrity + responsiveness in editor
- Refactor `AppStoreEditorForm` autosave from “single-field debounced payload” to **draft snapshot debounced save**:
  - Keep local draft state for all fields.
  - Debounce persists a merged payload (not only last key stroke).
  - Flush pending draft on blur, listing switch, and unmount.
- Add **save state indicator** (`Saving…` / `Saved` / `Save failed`) in editor header for trust.
- Update mutation strategy in `useAppStoreListings`:
  - Avoid full list invalidation on every keystroke-level update.
  - Use optimistic cache patch for selected listing + periodic/targeted refetch.

### Phase 2 — Make previews bigger + fully readable
- Increase device frame size (responsive):
  - Apple and Google width/height increased (with fallback on narrow panels).
  - Keep internal device scroll behavior.
- Add expand/collapse states for long sections:
  - Apple: description + what’s new.
  - Google: short description + full description + what’s new.
- Preserve formatting with `whitespace-pre-line` for multiline content.
- Keep existing realism updates (info bars, data safety, screenshot slots), but remove dead controls and ensure all “more/less” controls are functional.

### Phase 3 — External link generation reliability (must-fix)
- In `AppStoreShareDialog`:
  - After generate/toggle, immediately sync UI via correct query invalidation and/or local state update from mutation result.
  - Show deterministic states: “No link”, “Generating”, “Active link”, “Disabled”.
- In `usePublicAccessManagement.generateLink`:
  - For resource-specific links (`resource_id` present), deactivate prior active links for same `(resource_type, resource_id)` before inserting new one.
- Add DB guardrail migration:
  - Cleanup duplicates (keep newest active link per `(resource_type, resource_id)`).
  - Add partial unique index for active resource-scoped links.
- Standardize review URLs to one helper and one behavior (`/r/:token`) so link behavior is consistent everywhere.

### Phase 4 — Complete external review + ops visibility
- Ensure app-store public review uses the same robust pattern as other resources:
  - Solid loading/error/empty states.
  - Reliable data fetch with token access.
- Add/align app_store support in `/admin/external-links`:
  - Badge/type mapping.
  - Filter tab.
  - Stats count card.
  - Copy/open behavior using universal token route helper.

### Phase 5 — Best-practice polish for Apple/Google content structure
- Align section order and labels to store patterns for clearer stakeholder review.
- Keep metadata vs storefront-visible distinctions clear (e.g., keywords not shown as storefront content).
- Improve screenshot note rendering readability (number badges, placeholder behavior, no clipped core info).

## Files to update

- `src/components/app-store/AppStoreEditorForm.tsx`
- `src/hooks/useAppStoreListings.ts`
- `src/components/app-store/AppleStorePreview.tsx`
- `src/components/app-store/GooglePlayPreview.tsx`
- `src/components/app-store/AppStorePreview.tsx`
- `src/components/app-store/AppStoreShareDialog.tsx`
- `src/hooks/usePublicAccess.ts`
- `src/lib/urlHelpers.ts` (and remove duplicated URL logic usage where needed)
- `src/pages/admin/ExternalLinksManagement.tsx`
- `supabase/migrations/<new>.sql` (dedupe + unique active-link index for resource_id scope)

## Validation checklist (done before handoff)

1. **Typing stress test**: rapid edits across multiple fields; no dropped values.
2. **Save-state UX**: saving/saved/failure states visible and accurate.
3. **Preview readability**: full description and what’s-new visible via expand/scroll on both stores.
4. **Bigger preview**: clearly larger frames in planner and external review.
5. **Link generation**:
   - Generate link -> appears immediately in dialog.
   - Copy/open uses `/r/:token`.
   - Toggle active updates state correctly.
   - Regenerate does not create duplicate active links.
6. **External review route**:
   - Token resolves and renders app store content.
   - Invalid/expired/deactivated links show proper error states.
7. **Admin external links**:
   - app_store links visible in list, filter, stats, and actions.

## Acceptance criteria

- You can read full long descriptions in preview without truncation issues.
- Previews are visibly larger and still scroll naturally like device screens.
- External link generation is deterministic and immediately reflected in UI.
- No silent data loss during rapid editing.
- App Store links are first-class in external link admin management.
