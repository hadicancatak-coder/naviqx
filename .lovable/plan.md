

# App Store Listing Planner

## Overview
A new page at `/ads/app-store` for writing and previewing Apple App Store and Google Play Store product page listings. Two-column layout: editor on the left, live device preview on the right. Store toggle (Apple/Google Play) at the top, with EN/AR locale tabs per listing -- mirroring the existing language pattern from the Google Planner.

## Page Layout

```text
+----------------------------------------------+
| Header: "App Store Planner"  [Apple | Play]  |
+----------------------------------------------+
| Listing List  |  Editor Form  |  Live Preview |
| (sidebar)     |  (fields)     |  (device)     |
| 20%           |  45%          |  35%           |
+----------------------------------------------+
```

- **Left panel**: List of saved listings (like LpPlanner's map list). Each listing has a name, store type badge, and locale indicator.
- **Center panel**: The editor form with all metadata fields, validation counters, and EN/AR locale tabs at the top.
- **Right panel**: A realistic device-frame preview showing exactly how the listing will appear on the App Store or Play Store.

## Store-Specific Fields

### Apple App Store
| Field | Max Length | Notes |
|-------|-----------|-------|
| App Name | 30 chars | |
| Subtitle | 30 chars | |
| Promotional Text | 170 chars | Updatable without new version |
| Description | 4000 chars | Rich text |
| Keywords | 100 chars | Comma-separated |
| What's New | 4000 chars | Release notes |
| Primary Category | dropdown | Apple categories |
| Secondary Category | dropdown | Optional |
| Screenshots | up to 10 | Placeholder slots |
| App Previews | up to 3 | Video placeholder slots |

### Google Play Store
| Field | Max Length | Notes |
|-------|-----------|-------|
| App Name | 30 chars | |
| Short Description | 80 chars | |
| Full Description | 4000 chars | Rich text |
| What's New | 500 chars | Release notes |
| Category | dropdown | Play Store categories |
| Tags | up to 5 | |
| Screenshots | up to 8 | Placeholder slots |
| Feature Graphic | 1 | Banner placeholder |

## EN/AR Locale Support
Each listing stores content per locale. Tabs at the top of the editor switch between EN and AR. AR content renders RTL in the preview. Same pattern as the Search Planner's entity/language handling.

## Live Preview
- **Apple**: iPhone frame showing App Store product page layout (icon placeholder, name, subtitle, rating stars, screenshots carousel, description with "more" truncation, promotional text, What's New section)
- **Google Play**: Phone frame showing Play Store layout (icon, name, developer, rating, feature graphic, screenshots row, short description, full description expandable)
- Preview updates in real-time as user types (same `onFieldChange` callback pattern as SearchPlanner)

## Database Schema

### New table: `app_store_listings`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Internal listing name |
| store_type | text | 'apple' or 'google_play' |
| locale | text | 'en' or 'ar' |
| app_name | text | |
| subtitle | text | Apple only |
| short_description | text | Google Play only |
| promotional_text | text | Apple only |
| description | text | |
| keywords | text | Apple only, comma-separated |
| whats_new | text | |
| primary_category | text | |
| secondary_category | text | |
| tags | jsonb | Google Play tags array |
| screenshot_notes | jsonb | Placeholder descriptions |
| created_by | uuid | FK to profiles |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Authenticated users can CRUD their own org's listings (same pattern as other tables).

## File Structure

```text
src/
  pages/
    AppStorePlanner.tsx           -- Main page component (3-col resizable)
  components/
    app-store/
      AppStoreListingList.tsx     -- Left sidebar listing list
      AppStoreEditorForm.tsx      -- Center editor with all fields
      AppStorePreview.tsx         -- Right preview panel
      AppleStorePreview.tsx       -- Apple-specific device preview
      GooglePlayPreview.tsx       -- Google Play-specific device preview
      AppStoreFieldCounter.tsx    -- Character counter component
  hooks/
    useAppStoreListings.ts       -- CRUD hooks for listings table
  domain/
    app-store/
      index.ts                   -- Types, enums, categories, validation schemas
```

## Navigation
- Add "App Store" item to `adsItems` in `AppSidebar.tsx` with `Smartphone` icon
- Route: `/ads/app-store` in `App.tsx`
- Eagerly loaded (same as other ads pages)

## Design System Compliance
- 3-column `ResizablePanelGroup` (same as SearchPlanner)
- `liquid-glass-elevated` on side panels, `liquid-glass` header
- `PageHeader` component for title
- Semantic tokens throughout: `text-heading-sm`, `text-body-sm`, `text-metadata`, `bg-card`, `border-border`
- `transition-smooth` and `hover-lift` on interactive elements
- Character counters use progress bars with status colors (green/yellow/red)
- Device frame previews use rounded corners and shadows for realism

## Implementation Steps
1. Create database migration for `app_store_listings` table with RLS policies
2. Create domain module (`src/domain/app-store/index.ts`) with types, categories, and Zod validation
3. Create CRUD hooks (`useAppStoreListings.ts`)
4. Build the editor form component with all fields and character counters
5. Build Apple Store and Google Play preview components with device frames
6. Build the listing list sidebar
7. Assemble the main page with 3-column layout
8. Add route and sidebar navigation entry

