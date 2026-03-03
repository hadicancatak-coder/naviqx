

# App Store Planner — Complete Overhaul Plan

## Current State (Honest Assessment)

The page is functional but bare-bones. The sidebar create section is ugly and confusing (screenshot confirms). The editor works with debounced saves. The preview mockups exist but are basic. External sharing works via the unified `/r/:token` system. But the tool is far from being a "perfect product page builder" — it lacks version management, approval workflows, status tracking, and the sidebar UX is poor.

## What Needs to Change

### Phase 1: Fix the Sidebar (The Part You're Pointing At)

**Problem:** The create form (name input + Apple/Play buttons + Create button) sits at the top taking up space and looks clunky. No search, no status indicators, no visual hierarchy.

**Fix:**
- Move "Create" to a compact `+ New Listing` button at the top of the sidebar
- Clicking it opens an inline collapsible form (or a small dialog) with: name input, store type toggle, locale picker, Create button
- Add a search/filter input below the button for finding listings
- Each listing item in the sidebar shows: name, store badge (Apple/Play), locale badge, **status pill** (Draft / Ready / Approved / Live), and last-updated timestamp
- Delete action stays as hover-reveal trash icon

### Phase 2: Add Status & Approval Workflow

**Database migration — add columns to `app_store_listings`:**
- `status` enum: `draft`, `ready_for_review`, `approved`, `needs_changes`, `live` (default: `draft`)
- `version` integer (default: 1, auto-increment on significant saves)
- `approved_by` uuid nullable
- `approved_at` timestamp nullable
- `review_notes` text nullable (reviewer feedback)

**Editor changes:**
- Add a status selector in the editor header (dropdown: Draft → Ready for Review → Approved → Live)
- Show version number badge
- When status is `ready_for_review`, the Share button becomes more prominent (pulsing or highlighted)
- When an external reviewer submits feedback via the shared link, it appears as `review_notes` with status auto-set to `needs_changes`

**External review page changes (`AppStoreReviewContent.tsx`):**
- Add an "Approve" and "Request Changes" button for reviewers
- Approve: sets status to `approved`, records reviewer name/email + timestamp
- Request Changes: opens a text field for feedback, sets status to `needs_changes`
- Both actions write to the `app_store_listings` table via a new edge function (since external users are unauthenticated, we need a secure RPC)
- Add store toggle in external review too (so reviewer can see both iOS and Android previews)

### Phase 3: Translation Workflow

**Database migration — add table `app_store_translations`:**
- `id` uuid PK
- `listing_id` references `app_store_listings(id)` on delete cascade
- `locale` text (ar, fr, etc.)
- `app_name`, `subtitle`, `short_description`, `description`, `keywords`, `whats_new`, `promotional_text` — all nullable text
- `status` enum same as listings (draft/ready_for_review/approved)
- `translated_by` text nullable
- `created_at`, `updated_at`

**UI changes:**
- Add a "Translations" tab in the editor (alongside the current EN/AR toggle)
- Clicking a locale shows side-by-side: original (EN) on left, translation fields on right
- Translation fields auto-populate from the original as placeholder text
- Each translation has its own status badge and can be shared independently for review

### Phase 4: Improve the Preview Mockups

The current mockups are close but need polish:
- **Apple:** The Dynamic Island, info bar, ratings section, and screenshot carousel match the real App Store layout. Keep as-is but improve screenshot slots to show numbered badges more clearly.
- **Google:** Good structure. Add the "Ratings and reviews" section (currently missing from Google preview) with rating distribution bars.
- Both: Add a "Dark Mode" toggle within the phone preview to show how the listing looks in dark/light store themes.

### Phase 5: Polish & Quality of Life

- **Duplicate listing:** Button to clone a listing (useful for creating translations or A/B variants)
- **Export:** Button to export listing text as a formatted document (for ASO teams)
- **Completeness indicator:** Already exists in preview header — also show it in the sidebar per listing
- **Keyboard shortcuts:** Cmd+S to force-save, Cmd+N to create new listing

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/app-store/AppStoreListingList.tsx` | Rewrite sidebar: compact create, search, status pills |
| `src/components/app-store/AppStoreEditorForm.tsx` | Add status selector, version badge in header |
| `src/components/app-store/AppStorePreview.tsx` | Already has store toggle — add dark mode preview toggle |
| `src/components/app-store/GooglePlayPreview.tsx` | Add ratings section |
| `src/components/external/AppStoreReviewContent.tsx` | Add Approve/Request Changes buttons, store toggle |
| `src/domain/app-store/index.ts` | Add `ListingStatus` type, update `AppStoreListing` interface |
| `src/hooks/useAppStoreListings.ts` | Handle new status/version fields |
| `supabase/functions/approve-app-listing/index.ts` | New edge function for external approval |
| **DB migration** | Add `status`, `version`, `approved_by`, `approved_at`, `review_notes` columns |

## Execution Order

1. Database migration (add columns with safe defaults so existing data works)
2. Update domain types and hook
3. Rewrite sidebar component
4. Add status workflow to editor
5. Build external approval flow (edge function + review UI)
6. Translation workflow (Phase 3 — can be deferred if you want to ship iteratively)
7. Preview polish

## Technical Notes

- The `status` column uses a text type with check constraint (not a Postgres enum, to avoid migration pain)
- The edge function for external approval accepts the access token + action, verifies the token is valid and active, then updates the listing — this avoids giving unauthenticated users direct table access
- All existing RLS policies on `app_store_listings` remain intact; the edge function runs with service role
- Build errors in the console are from `playwright-core` types — unrelated to our code, pre-existing

