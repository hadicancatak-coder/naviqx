
## Fix: Radix ScrollArea Internal Content Wrapper Causing Overflow

### Root Cause Analysis (FINAL)

After deep investigation of the Radix UI source code, the **actual** root cause has been identified:

**Radix's ScrollAreaPrimitive.Viewport** internally wraps all children in a div with these inline styles:
```javascript
style: { minWidth: "100%", display: "table" }
```

This is hardcoded in `@radix-ui/react-scroll-area` (line 130 of their source).

**Why this causes overflow:**
1. `display: table` makes the element size to fit its content (like an HTML table)
2. When text content is long and doesn't break, the "table" expands to fit it
3. `min-width: 100%` prevents it from shrinking below 100%, but doesn't prevent expanding
4. The parent viewport's `overflow-x: hidden` clips what you can SEE, but the child still expands and creates the overflow visual issue we're seeing

The previous fixes (adding `overflow-x-hidden` to ScrollArea Viewport and Sheet) didn't work because they only affect clipping, not the internal sizing behavior of the `display: table` child.

---

### Solution

Add a **global CSS rule** in `src/index.css` to override Radix's internal wrapper styling:

```css
/* Fix Radix ScrollArea internal content wrapper expanding beyond bounds */
[data-radix-scroll-area-viewport] > div {
  display: block !important;
  min-width: 0 !important;
}
```

This targets the direct child div of the Radix viewport (which has the data attribute) and:
1. Changes `display: table` to `display: block` - block elements don't expand to fit content horizontally
2. Sets `min-width: 0` - allows the element to shrink as needed

---

### Technical Changes

**File: `src/index.css`**

Add the following CSS rule in the `@layer base` section (around line 280, after other base styles):

```css
/* ========================================
   RADIX SCROLLAREA FIX
   Override internal table display that causes horizontal overflow
   ======================================== */
[data-radix-scroll-area-viewport] > div {
  display: block !important;
  min-width: 0 !important;
}
```

---

### Cleanup (Optional but Recommended)

The previous workarounds in the base components can now be reverted since they weren't addressing the actual issue:

**File: `src/components/ui/scroll-area.tsx`** (line 11)
- The `!overflow-x-hidden` addition was correct and should be kept as a defensive measure
- No changes needed

**File: `src/components/ui/sheet.tsx`** (line 32)
- The `overflow-x-hidden` addition is correct and should be kept
- No changes needed

---

### Why This Will Work

1. **Targets the actual problem**: The internal Radix wrapper div, not the outer containers
2. **Global fix**: Applies to ALL ScrollAreas in the app, preventing this issue anywhere
3. **Safe override**: `display: block` is the expected behavior for content containers
4. **`!important` is necessary**: Radix applies inline styles which have higher specificity than CSS classes

---

### Files to Modify

1. **`src/index.css`** - Add the CSS rule to fix Radix ScrollArea internal wrapper

---

### Expected Result

- All sidebar content will respect container boundaries
- Long text will wrap naturally within the ScrollArea
- No horizontal overflow in CampaignDetailSheet or any other Sheet/ScrollArea
- TaskDetail will continue working as before (this is a safe, additive change)
