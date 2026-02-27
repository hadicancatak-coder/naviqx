

# Improve App Store Previews

## What's Changing

### 1. Remove App Previews Section (Apple)
The "App Previews" section (3 video placeholder slots) in `AppleStorePreview.tsx` will be removed entirely. It adds visual noise with no real utility since we don't support video uploads.

### 2. Make Previews Scrollable Inside Device Frame
Currently the device frame grows infinitely tall. Instead, the inner content area of both device frames will get a **fixed height with internal scrolling**, simulating a real phone screen. The user scrolls *inside* the device to see all content -- just like a real phone.

- Apple frame: ~520px visible content area with `overflow-y-auto`
- Google Play frame: ~500px visible content area with `overflow-y-auto`

### 3. Visual Polish -- More Realistic Previews

**Apple App Store Preview improvements:**
- Add an info bar below the GET button (Age rating, Category, Developer, Language, Size) matching real App Store layout
- Better screenshot slots with subtle gradient backgrounds and numbered indicators
- Add "Ratings & Reviews" section header with star breakdown hint
- Remove "Keywords" from preview (keywords are metadata, never shown to users on the actual App Store page)
- Better spacing and typography hierarchy

**Google Play Preview improvements:**
- Move "Install" button styling to match current Play Store (rounded-full pill)
- Add a "Data safety" placeholder section (matches real Play Store)
- Remove Feature Graphic from being shown inline (it's used as a banner, not in the listing body in the current Play Store design)
- Better About section with arrow indicator for expand

### 4. Completion Indicator
Add a small **completeness score** in the preview header showing how many fields are filled vs. total relevant fields (e.g., "6/9 fields complete"). Helps the user know at a glance what's missing.

### 5. Screenshot Notes as Numbered Slots in Preview
Instead of generic "Screenshot 1, 2, 3..." labels, only show slots for screenshots that have notes written. Empty slots beyond that show a faded "+" indicator. This makes the preview feel more intentional.

## Technical Details

### Files Modified
- **`src/components/app-store/AppleStorePreview.tsx`** -- Remove App Previews, add fixed-height scroll, info bar, better visual hierarchy, remove Keywords display
- **`src/components/app-store/GooglePlayPreview.tsx`** -- Add fixed-height scroll, data safety section, remove feature graphic from body, pill-style Install button
- **`src/components/app-store/AppStorePreview.tsx`** -- Add completeness indicator in the header

### No Database Changes
All changes are purely frontend/UI.

