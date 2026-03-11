

# Plan: Review Feedback Visibility + External Translation Workflow

## Three Issues to Solve

1. **Review feedback visibility**: When an external reviewer requests changes, the `review_notes` only shows in the editor header as a small warning banner. There's no notification, no centralized view, and it's easy to miss.

2. **External translation access**: Translators need to access translations from outside (via shared link) and edit them directly — the current external review page is read-only for translations.

3. **Email validation for translators**: When a translator submits work externally, their email must match the allowed domain from `app_settings` (currently hardcoded as `@cfi.trade` in the header, but should be dynamic).

---

## Implementation

### 1. Review Feedback Panel in Editor

Add a dedicated "Review Feedback" section in `AppStoreEditorForm.tsx` that is more prominent:
- When `status === "needs_changes"` and `review_notes` exists, show a prominent card (not just a tiny banner) with: reviewer name (`approved_by` field stores the reviewer identity), timestamp, and the full feedback text.
- Add a "Dismiss & Mark as Draft" button to acknowledge feedback and reset status to `draft`.

Also update the sidebar (`AppStoreListingList.tsx`) to show a small warning indicator (orange dot or icon) on listings with `needs_changes` status — this already exists via the status pill, so it's covered.

### 2. External Translation Page via Edge Function

The external review page currently shows translations as read-only locale toggles. We need to make it editable for translators:

**New Edge Function: `submit-app-translation`**
- Accepts: `access_token`, `locale`, translation fields, `translator_email`
- Validates: token is active + `resource_type === 'app_store'`, email matches allowed domain from `app_settings`
- Upserts into `app_store_translations` using service role (bypasses RLS for anonymous users)
- Sets `translated_by` to the translator's email
- Sets `status` to `ready_for_review`

**RLS for anonymous read access:**
- Add an `anon` SELECT policy on `app_store_translations` so the external page can fetch translations without auth.
- Also ensure `app_store_listings` has anon SELECT (check existing — the external review already reads it via the Supabase client, but this works because it queries with the anon key).

**Update `AppStoreReviewContent.tsx`:**
- Add a "Translate" mode alongside the existing "Preview" + "Approve" flow.
- When a translator selects a locale (or the base listing locale), show a side-by-side editor (similar to `TranslationEditor.tsx` but simplified for external use).
- Before allowing edits, require email identification (reuse the existing header identification flow).
- Validate email against allowed domains by fetching from `app_settings` via a lightweight query or via the edge function.
- On save, call the `submit-app-translation` edge function.
- Show a success state: "Translation submitted for review".

### 3. Dynamic Email Domain Validation

**Update `ExternalReviewHeader.tsx`:**
- Currently hardcodes `@cfi.trade`. Instead, fetch allowed domains from `app_settings` on mount and validate against them dynamically.
- This benefits all external review pages, not just app store.

Alternatively, move the validation to the edge function (server-side) so the client just submits and the server rejects invalid domains. This is more secure. The client can still show a hint ("Only @cfi.trade emails allowed") but the real enforcement happens server-side.

### 4. Database Changes

**Migration:**
- Add `anon` SELECT policy on `app_store_translations` (for external page to read)
- Add `anon` SELECT policy on `app_store_listings` if not present (check — the external page fetches listing data)

### Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/submit-app-translation/index.ts` | **New** — edge function for external translation submission with email domain validation |
| `src/components/external/AppStoreReviewContent.tsx` | Add translation editing mode for external translators |
| `src/components/app-store/AppStoreEditorForm.tsx` | Enhance review feedback display with dismiss action |
| `supabase/config.toml` | Skip — auto-managed |
| **DB migration** | Add anon SELECT policies on translations + listings tables |

### Execution Order

1. Database migration (anon read policies)
2. Create `submit-app-translation` edge function
3. Update `AppStoreReviewContent.tsx` with translation editing
4. Enhance review feedback in editor form

