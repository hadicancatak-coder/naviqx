

## Fix: Bigger phone mockups + Apple/Google toggle

### Current problem (from screenshot)
The phone mockup appears small because:
- Preview panel is only 35% of width
- Phone frame is fixed at 390px with 780px content height — but the panel barely accommodates it, leaving no room to breathe
- No way to toggle between Apple and Google Play views

### Changes

**1. `AppStorePlanner.tsx`** — Rebalance panels: 18% listings / 40% editor / 42% preview. This gives ~600px for the preview panel on a 1440px screen.

**2. `AppStorePreview.tsx`** — Add an Apple/Google toggle (two icon buttons) in the preview header. Default to the listing's `store_type` but allow switching. Both preview components already accept the same props.

**3. `AppleStorePreview.tsx`** — Proper iPhone 15 Pro mockup:
- Dynamic Island instead of old notch (pill shape: `w-[120px] h-[35px] rounded-[18px]`)
- Frame: `w-[430px]`, content height `h-[860px]`, `rounded-[50px]`
- Bigger screenshot slots (`w-[120px] h-[214px]`)
- Side bezel with `border-[4px]`

**4. `GooglePlayPreview.tsx`** — Proper Pixel-style mockup:
- Punch-hole camera (small circle top-center) instead of status bar icons
- Frame: `w-[430px]`, content height `h-[860px]`, `rounded-[36px]`
- Bottom gesture bar (thin pill)
- Bigger screenshot slots (`w-[130px] h-[230px]`)

No database changes needed. Four files modified.

