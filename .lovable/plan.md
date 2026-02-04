
## Fix: Popup Components Overflow Beyond Boundaries

### Problem Analysis

Looking at the screenshot, text content inside the "Create Page" dialog is expanding freely beyond the dialog boundaries. This is happening because:

1. **Dialog uses `grid` layout** (line 66 of `dialog.tsx`): Grid children can expand based on content if not constrained
2. **No horizontal overflow clipping**: The dialog has `overflow-y-auto` for vertical scroll but no `overflow-x-hidden` to prevent horizontal expansion
3. **Missing aggressive word-break**: Long strings without spaces (like "sfghsdfgdfhd" repeated) need `word-break: break-all` or `overflow-wrap: anywhere` to force breaking

This affects all popup components: Dialogs, Popovers, Sheets, Drawers, Dropdowns.

---

### Solution

Fix at two levels:

**1. Global CSS: Add text wrapping rules for popup content**

Add to `src/index.css` a rule that forces all popup content to wrap text and respect boundaries:

```css
/* ========================================
   POPUP CONTENT OVERFLOW FIX
   Force text wrapping inside dialogs, popovers, sheets, drawers
   Prevents long unbroken strings from expanding containers
   ======================================== */
[data-radix-dialog-content],
[data-radix-alert-dialog-content],
[data-radix-popover-content],
[data-radix-popper-content-wrapper] {
  overflow-x: hidden !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
}

/* Ensure all child text elements also respect boundaries */
[data-radix-dialog-content] *,
[data-radix-alert-dialog-content] *,
[data-radix-popover-content] * {
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
}
```

**2. Component Level: Update base Dialog component**

Update `src/components/ui/dialog.tsx` line 66 to add `overflow-x-hidden`:

```tsx
// BEFORE:
"fixed left-[50%] top-[50%] z-[10002] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-md liquid-glass-dialog p-lg pb-sm duration-200 max-h-[90vh] overflow-y-auto hide-scrollbar rounded-2xl"

// AFTER:
"fixed left-[50%] top-[50%] z-[10002] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-md liquid-glass-dialog p-lg pb-sm duration-200 max-h-[90vh] overflow-x-hidden overflow-y-auto hide-scrollbar rounded-2xl"
```

**3. Component Level: Update Popover component**

Update `src/components/ui/popover.tsx` to add `overflow-x-hidden`:

```tsx
// BEFORE (line 19):
"z-popover min-w-[200px] max-h-[400px] overflow-y-auto hide-scrollbar rounded-xl..."

// AFTER:
"z-popover min-w-[200px] max-h-[400px] overflow-x-hidden overflow-y-auto hide-scrollbar rounded-xl..."
```

**4. TipTap Editor: Strengthen word-breaking**

Update `src/components/editor/RichTextEditor.tsx` line 109 to use more aggressive word-breaking:

```tsx
// BEFORE:
'break-words [word-break:break-word] [overflow-wrap:break-word]'

// AFTER (use break-all for unbreakable strings):
'break-all [word-break:break-all] [overflow-wrap:anywhere]'
```

Also add to the `.ProseMirror` selector:
```tsx
'[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[60px] [&_.ProseMirror]:break-all [&_.ProseMirror]:[word-break:break-all]'
```

---

### Technical Details

| File | Change |
|------|--------|
| `src/index.css` | Add global CSS rules for all Radix popup components |
| `src/components/ui/dialog.tsx` | Add `overflow-x-hidden` to DialogContent classes |
| `src/components/ui/popover.tsx` | Add `overflow-x-hidden` to PopoverContent classes |
| `src/components/editor/RichTextEditor.tsx` | Strengthen word-breaking to `break-all` |

---

### Expected Result

- All popup components (dialogs, popovers, sheets) will clip horizontal overflow
- Long unbroken text strings will break at any character to stay within boundaries
- The "Create Page" dialog and all similar dialogs will properly contain their content
- TipTap editor content will wrap correctly inside dialogs
