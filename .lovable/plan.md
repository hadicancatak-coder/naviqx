
## Fix: Version Row Overflow in Campaign Detail Sheet

### Problem
The version row in the sidebar is overflowing because the flex container structure does not properly constrain the width. The `truncate` class on the version notes requires every parent in the chain to have proper width constraints. Currently, the text pushes out of the sidebar boundary.

### Root Cause
1. The outer version row (`flex items-center gap-sm`) lacks `overflow-hidden`
2. The inner version info container structure allows content to expand beyond bounds
3. The flex items are not properly constrained to allow truncation to work

### Solution
Add `overflow-hidden` to the version row container AND ensure the nested flex structure properly constrains width at every level.

### Technical Changes

**File: `src/components/campaigns/CampaignDetailSheet.tsx`**

Update the version row structure (lines 168-236):

```tsx
<div
  key={version.id}
  onClick={() => setSelectedVersionId(version.id)}
  className={cn(
    "flex items-center gap-sm p-sm rounded-lg cursor-pointer transition-smooth overflow-hidden",  // ADD overflow-hidden
    selectedVersion?.id === version.id
      ? "bg-primary/10 border border-primary/30"
      : "bg-card border border-border hover:bg-card-hover"
  )}
>
  {/* Thumbnail - no changes */}
  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
    ...
  </div>

  {/* Version Info - add overflow-hidden */}
  <div className="flex-1 min-w-0 overflow-hidden">
    <div className="flex items-center gap-xs">
      <Badge variant="outline" className="text-metadata shrink-0">
        V{version.version_number}
      </Badge>
      <span className="text-body-sm text-foreground truncate">
        {version.version_notes || "No notes"}
      </span>
    </div>
    <p className="text-metadata text-muted-foreground truncate">
      {format(new Date(version.created_at), "MMM d, yyyy")}
      {version.creator_name && ` • ${version.creator_name}`}
    </p>
  </div>

  {/* Actions - no changes */}
  <div className="flex items-center gap-xs shrink-0">
    ...
  </div>
</div>
```

### Key Fixes
1. Add `overflow-hidden` to the main version row container (line 172)
2. Add `overflow-hidden` to the version info container (line 196)
3. Simplify the span class to just `truncate` (the parent constraints will do the work)

This ensures the entire flex chain properly constrains width so truncation works as expected.
