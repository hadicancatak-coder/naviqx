

# Fix Create Button + Add External Sharing for App Store Planner

## Issues Found

1. **Create button not working**: The `useAppStoreListings` hook inserts with typed Supabase client but the `tags` and `screenshot_notes` fields in the domain interface are `string[]` while the DB type is `jsonb`. The insert works but the `.select().single()` return is cast unsafely. More critically, the hook's `createListing` mutation doesn't pass `tags` or `screenshot_notes` defaults, and the Supabase typed client may reject unknown fields. Need to ensure the insert uses proper typing.

2. **External sharing not implemented**: The `ResourceType` union (`'campaign' | 'knowledge' | 'project' | 'lp_map' | 'search_ads'`) does not include `'app_store'`. No share dialog or external review content exists for app store listings.

3. **Build errors**: The playwright-core type errors are pre-existing and unrelated to our code -- they come from `node_modules`. No action needed.

## Plan

### Step 1: Fix the Create Button
- Update `useAppStoreListings.ts` to cast the Supabase client properly (same `as any` pattern used elsewhere) so the insert doesn't fail on type mismatches
- Ensure `tags` and `screenshot_notes` default values are included in the insert payload
- Verify the mutation's `onSuccess` callback correctly receives the created listing

### Step 2: Add Share Button to App Store Planner
- Add a "Share" button to the `AppStorePreview` header (or the main page header) that opens a share dialog
- Create `AppStoreShareDialog.tsx` following the same pattern as `ExternalAccessDialog.tsx` and `LpMapShareDialog.tsx`
- The dialog generates a public access link with `resource_type: 'app_store'` and `resource_id: listing.id`

### Step 3: Add `app_store` to ResourceType
- Update `usePublicAccess.ts` to include `'app_store'` in the `ResourceType` union
- Add RLS select policy on `app_store_listings` for anonymous access (needed for external preview) -- or use a security definer function

### Step 4: Create External Review Content for App Store
- Create `AppStoreReviewContent.tsx` in `src/components/external/` that renders a read-only preview of the listing (reusing `AppleStorePreview` / `GooglePlayPreview`)
- Add the `app_store` case to `PublicReview.tsx` with data fetching from `app_store_listings`

### Step 5: Add Route for External App Store Review
- Add route in `App.tsx`: `/app-store/review/:token` pointing to `PublicReview` with `resourceType="app_store"`
- Or rely on the universal `/r/:token` resolver (preferred) -- update the token resolver to handle `app_store` resource type

## Technical Details

### Files to Create
- `src/components/app-store/AppStoreShareDialog.tsx` -- Share dialog with reviewer name/email, entity selection, expiration

### Files to Modify
- `src/hooks/useAppStoreListings.ts` -- Fix insert casting, add default values
- `src/hooks/usePublicAccess.ts` -- Add `'app_store'` to ResourceType
- `src/pages/AppStorePlanner.tsx` -- Add share button, integrate share dialog
- `src/pages/PublicReview.tsx` -- Add `app_store` case with data fetching and review content
- `src/components/app-store/AppStorePreview.tsx` -- Add share button in header

### Database Migration
- Add an anonymous SELECT policy on `app_store_listings` for public review access (matching by ID from public_access_links)

