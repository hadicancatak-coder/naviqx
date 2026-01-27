
# Mobile Responsiveness Fix Plan

## Problem Summary
The website has significant mobile responsiveness issues caused by:
1. **Fixed grid columns** without mobile breakpoints (e.g., `grid-cols-3`, `grid-cols-4`)
2. **Horizontal overflow** from rigid layouts that don't stack vertically on small screens
3. **Admin tab bar** with 9 tabs cramped into a fixed grid
4. **Task board** using inline styles with `minmax(240px, 1fr)` causing horizontal scroll
5. **Filter bars** and form layouts not adapting to narrow viewports
6. **Kanban boards** with 4-column layouts that can't fit on mobile

---

## Implementation Overview

| Area | Issue | Fix |
|------|-------|-----|
| Task Detail Cards | `grid-cols-3` fixed | `grid-cols-1 sm:grid-cols-3` |
| Sprint Kanban | `grid-cols-4` fixed | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| Admin Tab Bar | 9 tabs in cramped grid | Horizontal scrollable tabs |
| Task Board View | Inline grid with fixed minmax | Responsive grid with mobile stacking |
| Create Task Dialog | `grid-cols-3` fixed | `grid-cols-1 sm:grid-cols-3` |
| Filter Bars | Fixed min-widths | Flexible widths with wrapping |
| Campaign Review | Input widths fixed | Full-width on mobile |

---

## Part 1: Core Layout Components

### 1.1 TaskDetailPriorityCard.tsx (Priority/Due/Status Grid)
**Current**: `grid-cols-3` - Forces 3 columns on all screen sizes
**Fix**: `grid-cols-1 sm:grid-cols-3` - Stack vertically on mobile

```typescript
// Line 54: Change
<div className="grid grid-cols-3 gap-sm p-sm rounded-lg bg-card border border-border">

// To
<div className="grid grid-cols-1 sm:grid-cols-3 gap-sm p-sm rounded-lg bg-card border border-border">
```

### 1.2 SprintKanban.tsx (4-Column Board)
**Current**: `grid-cols-4` - 4 columns always
**Fix**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` + horizontal scroll option

```typescript
// Line 71: Change
<div className="grid grid-cols-4 gap-md h-full">

// To
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md h-full overflow-x-auto">
```

### 1.3 TaskDetailDetails.tsx (Date Metadata)
**Current**: `grid-cols-3` for Created/Updated/Age
**Fix**: `grid-cols-1 sm:grid-cols-3`

```typescript
// Line 172: Change
<div className="grid grid-cols-3 gap-sm">

// To
<div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
```

### 1.4 CreateTaskDialog.tsx (Form Fields)
**Current**: `grid-cols-3` for Status/Priority/Due
**Fix**: `grid-cols-1 sm:grid-cols-3`

```typescript
// Line 398: Change
<div className="grid grid-cols-3 gap-md">

// To
<div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
```

---

## Part 2: Task Board View

### 2.1 TaskBoardView.tsx
**Current Issue**: Inline style with `gridTemplateColumns: repeat(${colCount}, minmax(240px, 1fr))` - causes horizontal scroll and doesn't adapt to mobile

**Fix Strategy**:
- Use Tailwind responsive classes instead of inline styles
- On mobile: Show 1 column with horizontal scrollable option
- On tablet: 2 columns
- On desktop: Dynamic based on group count

```typescript
// Line 91-95: Replace inline style grid
<div 
  className="grid gap-md"
  style={{ gridTemplateColumns: `repeat(${colCount}, minmax(240px, 1fr))` }}
>

// With responsive Tailwind classes
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-md">
```

For the dynamism, add a wrapper with horizontal scroll on mobile:
```typescript
<div className="overflow-x-auto -mx-md px-md sm:overflow-visible sm:mx-0 sm:px-0">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md min-w-[300px] sm:min-w-0">
    ...
  </div>
</div>
```

---

## Part 3: Admin Layout Tabs

### 3.1 AdminLayout.tsx
**Current Issue**: `grid grid-cols-5 sm:grid-cols-9` - 9 tabs cramped into grid, overflow on mobile

**Fix Strategy**:
- Remove grid layout
- Use horizontal scroll with `overflow-x-auto`
- Add `flex-nowrap` to keep tabs in single row
- Style with proper spacing

```typescript
// Line 25: Change
<TabsList className="grid grid-cols-5 sm:grid-cols-9 w-full lg:w-auto bg-muted/50">

// To
<TabsList className="flex overflow-x-auto w-full lg:w-auto bg-muted/50 gap-1 pb-1">
```

### 3.2 TabsList Component (tabs.tsx)
Add scrollable behavior support:

```typescript
// Line 14-18: Update base styles
className={cn(
  "inline-flex h-10 items-center justify-start gap-1 border-b border-border text-muted-foreground overflow-x-auto scrollbar-none",
  className,
)}
```

---

## Part 4: Filter Bar & Form Inputs

### 4.1 FilterBar.tsx
**Current**: `min-w-[200px] max-w-[260px]` for search - too rigid

**Fix**: Make responsive with full-width on mobile:
```typescript
// Line 32: Change
<div className="relative min-w-[200px] max-w-[260px]">

// To
<div className="relative w-full sm:min-w-[200px] sm:max-w-[260px]">
```

### 4.2 Campaign Review (CampaignReview.tsx)
**Current**: Fixed width inputs `w-40`, `w-48`
**Fix**: Full width on mobile with breakpoints

```typescript
// Lines 461-467: Change
<Input ... className="w-40 h-8" />
<Input ... className="w-48 h-8" />

// To
<Input ... className="w-full sm:w-40 h-8" />
<Input ... className="w-full sm:w-48 h-8" />
```

Also update the flex container to stack on mobile:
```typescript
// Line 455: Change
<div className="flex items-center gap-md flex-wrap">

// To
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-sm sm:gap-md">
```

---

## Part 5: Dashboard Grids

### 5.1 Dashboard.tsx
**Current**: Already has `grid-cols-1 lg:grid-cols-2` and `grid-cols-1 lg:grid-cols-3` - GOOD!
**Status**: Dashboard is already mobile-responsive.

---

## Part 6: Stats & Analytics Cards

### 6.1 HeadlineDiversityChecker.tsx
**Current**: `grid-cols-3` for stats
**Fix**: `grid-cols-1 sm:grid-cols-3`

```typescript
// Line 87: Change
<div className="grid grid-cols-3 gap-sm p-sm rounded-md bg-muted/50">

// To
<div className="grid grid-cols-1 sm:grid-cols-3 gap-sm p-sm rounded-md bg-muted/50">
```

---

## Part 7: Global CSS Utilities

Add mobile-friendly utilities to `src/index.css`:

```css
/* Scrollbar hiding for horizontal scroll on mobile */
.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

/* Mobile safe area padding */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tasks/TaskDetail/TaskDetailPriorityCard.tsx` | `grid-cols-1 sm:grid-cols-3` |
| `src/components/tasks/TaskDetail/TaskDetailDetails.tsx` | `grid-cols-1 sm:grid-cols-3` |
| `src/components/sprints/SprintKanban.tsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `src/components/tasks/TaskBoardView.tsx` | Responsive grid + scroll wrapper |
| `src/components/CreateTaskDialog.tsx` | `grid-cols-1 sm:grid-cols-3` |
| `src/pages/admin/AdminLayout.tsx` | Scrollable tabs |
| `src/components/ui/tabs.tsx` | Support overflow scroll |
| `src/components/layout/FilterBar.tsx` | Flexible widths |
| `src/pages/CampaignReview.tsx` | Stack inputs on mobile |
| `src/components/search/HeadlineDiversityChecker.tsx` | `grid-cols-1 sm:grid-cols-3` |
| `src/index.css` | Add scrollbar-none utility |

---

## Testing Checklist

After implementation, test on these viewports:
1. Mobile (320px-480px) - iPhone SE, small phones
2. Mobile (480px-768px) - Large phones
3. Tablet (768px-1024px) - iPad
4. Desktop (1024px+) - Laptops and monitors

Key tests:
- [ ] Admin tabs scrollable horizontally on mobile
- [ ] Task board columns stack/scroll properly
- [ ] Sprint kanban adapts to screen size
- [ ] Create task dialog fields stack vertically on mobile
- [ ] Filter bars wrap naturally
- [ ] No horizontal page overflow
- [ ] All interactive elements are tap-friendly (min 44px touch targets)

---

## Summary

The core issue is that many components use fixed grid column counts (e.g., `grid-cols-3`, `grid-cols-4`) without mobile-first responsive breakpoints. The fix is systematic:

1. **Replace** `grid-cols-N` with `grid-cols-1 sm:grid-cols-N`
2. **Add** horizontal scroll for unavoidably wide content (tabs, kanban)
3. **Make** input widths flexible with `w-full sm:w-[fixed]`
4. **Stack** flex layouts vertically on mobile with `flex-col sm:flex-row`

This follows the mobile-first design principle where the default is mobile layout, and larger screens progressively enhance.
