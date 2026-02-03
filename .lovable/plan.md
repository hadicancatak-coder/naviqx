

## Complete Rebuild: Version Section in CampaignDetailSheet

### Problem Analysis

Looking at the current code and screenshot, there are two critical issues:

1. **Duplicate version display**: The version list shows the version row, AND then below it shows "Version 1 Details" with the same content again - this is redundant
2. **Text overflow**: Long version notes are not wrapping properly in the version list row, causing the entire row to overflow outside the sidebar

The root cause is the current architecture shows versions twice:
- Once in the compact list view (lines 166-239)  
- Again in the expanded detail section (lines 242-316)

This is confusing and wastes space. When there's only one version, showing the same content twice is redundant.

---

### Solution: Single Unified Version Display

Rebuild the versions section with these principles:
1. **Single source of truth** - show version content ONCE, not twice
2. **Proper text wrapping from the start** - use `word-break: break-word` and `overflow-wrap: anywhere` 
3. **Clean compact design** - version list rows stay compact and clickable
4. **Expandable details inline** - when clicked, expand details within the same row context

---

### Technical Implementation

**File: `src/components/campaigns/CampaignDetailSheet.tsx`**

**Step 1: Remove the duplicate "Selected Version Detail" section entirely** (lines 242-316)

The current code has:
- Version list (compact rows with thumbnail, version number, truncated notes)
- Then a SEPARATE "Version N Details" section that repeats the same information

This redundancy will be removed. Instead, we'll have:
- Version list where clicking a version expands its details INLINE below that row

**Step 2: Rebuild version list with proper overflow handling**

The version list will have:
- **Version row container**: Use `w-full` (not relying on flex to constrain)
- **Text wrapping**: Apply `word-break: break-word` and `overflow-wrap: break-word` to ALL text elements
- **Expand behavior**: Clicking a version expands details below it (collapsible pattern)

**Step 3: Use Collapsible pattern from existing components**

Looking at `VersionCard.tsx` (lines 249-253), it already uses the Collapsible pattern correctly for comments. We'll use the same pattern for version details.

---

### New Structure

```tsx
{/* Versions Section */}
<div className="space-y-sm">
  <div className="flex items-center justify-between">
    <h3>Versions</h3>
    <Button>Add Version</Button>
  </div>

  {versions.map((version) => (
    <Collapsible 
      key={version.id}
      open={selectedVersionId === version.id}
      onOpenChange={() => setSelectedVersionId(prev => prev === version.id ? null : version.id)}
    >
      {/* Compact row header - always visible */}
      <CollapsibleTrigger asChild>
        <div className="version-row cursor-pointer">
          <Thumbnail />
          <VersionInfo (truncated) />
          <EditDeleteButtons />
        </div>
      </CollapsibleTrigger>

      {/* Expanded details - only when selected */}
      <CollapsibleContent>
        <div className="version-details">
          <LargeImagePreview />
          <FullVersionNotes (WRAPPED) />
          <Links />
          <Comments />
        </div>
      </CollapsibleContent>
    </Collapsible>
  ))}
</div>
```

---

### Specific Text Wrapping Rules

All text elements will use these classes:
- **Container**: `w-full overflow-hidden` - constrain the container width
- **Text blocks**: `break-words whitespace-pre-wrap` - standard wrapping
- **Long URLs/text**: Add `overflow-wrap: anywhere` via inline style if needed

For the version notes in the expanded section:
```tsx
<div className="bg-muted/50 rounded-lg p-sm border border-border/50">
  <p className="text-body-sm break-words whitespace-pre-wrap" 
     style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
    {version.version_notes}
  </p>
</div>
```

---

### Changes Summary

1. **Add imports**: `Collapsible, CollapsibleContent, CollapsibleTrigger` from `@/components/ui/collapsible`

2. **Rewrite versions section** (lines 146-316):
   - Replace the separate list + detail sections with a single Collapsible-based list
   - Each version is a collapsible item
   - Clicking opens/closes the detail view INLINE
   - No more duplicate display

3. **Apply text wrapping consistently**:
   - All text in compact row: `truncate` (shows ellipsis)
   - All text in expanded view: `break-words whitespace-pre-wrap` with inline `overflowWrap: 'anywhere'`

---

### Result

- **One version, one display** - no more showing the same info twice
- **Proper text wrapping** - long notes wrap within the sidebar bounds
- **Clickable rows** - the entire row becomes a toggle trigger
- **Cleaner UX** - expand to see details, collapse to hide
- **Edit/Delete buttons** - remain in the row header, accessible without expansion

