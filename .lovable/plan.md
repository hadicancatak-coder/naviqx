
## Fix: Sidebar Content Overflow in Campaign Detail Sheet

### Root Cause Analysis

The text is overflowing the sidebar boundary because of a cascading constraint failure:

1. **Sheet base styles issue**: In `sheet.tsx` line 32, the `sheetVariants` includes `overflow-y-auto` but NOT `overflow-x-hidden`, allowing horizontal content expansion
2. **ScrollArea viewport issue**: In `scroll-area.tsx` line 11, the `ScrollAreaPrimitive.Viewport` has `w-full` but no explicit overflow constraint, allowing children to expand beyond bounds
3. **Flexbox intrinsic sizing**: When using `flex flex-col` without explicit width constraints, flex items can size to their content, pushing beyond the container

### Solution

Fix at two strategic levels:

**1. Fix the Sheet component base styles** (`src/components/ui/sheet.tsx`)
- Add `overflow-x-hidden` to the base variant to prevent ANY horizontal overflow from sheets
- This is the systemic fix that prevents this issue in ALL sheets

**2. Fix the ScrollArea viewport** (`src/components/ui/scroll-area.tsx`)  
- Add `!overflow-x-hidden` to the viewport to ensure it clips horizontal content
- This ensures scroll areas properly constrain their children

### Technical Changes

#### File 1: `src/components/ui/sheet.tsx`

Update line 32 - add `overflow-x-hidden` to the base sheetVariants:

```tsx
// BEFORE (line 32):
"!fixed z-modal flex flex-col gap-md liquid-glass-elevated p-lg overflow-y-auto hide-scrollbar shadow-2xl..."

// AFTER:
"!fixed z-modal flex flex-col gap-md liquid-glass-elevated p-lg overflow-x-hidden overflow-y-auto hide-scrollbar shadow-2xl..."
```

#### File 2: `src/components/ui/scroll-area.tsx`

Update line 11 - add `!overflow-x-hidden` to the ScrollArea Viewport:

```tsx
// BEFORE (line 11):
<ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">

// AFTER:
<ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] !overflow-x-hidden">
```

#### File 3: `src/components/campaigns/CampaignDetailSheet.tsx`

Clean up the over-engineered inline styles and `!important` modifiers now that the base components are fixed:

**Line 94** - Simplify SheetContent classes:
```tsx
// BEFORE:
<SheetContent side="right" className="!w-full sm:!max-w-xl !p-0 flex flex-col !overflow-hidden">

// AFTER:
<SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
```

**Line 125** - Remove redundant inline styles:
```tsx
// BEFORE:
<div className="p-md space-y-md max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>

// AFTER:
<div className="p-md space-y-md">
```

**Line 253** - Remove redundant inline styles from CollapsibleContent:
```tsx
// BEFORE:
<div className="px-sm pb-sm space-y-sm max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>

// AFTER:
<div className="px-sm pb-sm space-y-sm">
```

**Keep the version notes** at lines 275-280 with proper text wrapping since that's actual content that needs to wrap:
```tsx
<p className="text-body-sm whitespace-pre-wrap break-words">
  {version.version_notes}
</p>
```

### Result

- **System-level fix**: All sheets and scroll areas now properly clip horizontal overflow
- **No more workarounds**: No need for `!important` modifiers or inline styles
- **Consistent behavior**: Matches how TaskDetail and other working sidebars behave
- **Proper text wrapping**: Long text wraps naturally within bounds
