
# Campaign Table - Versions as Sub-Rows with Improved Interactions

## Current Issues

| Problem | Location | Impact |
|---------|----------|--------|
| Versions shown as grid panel | `VersionInlinePanel.tsx` | Takes too much space, inconsistent with table design |
| Only expand button is clickable | `CampaignRow.tsx` line 298-308 | Poor UX - users expect row click |
| No edit/delete for versions | `VersionInlinePanel.tsx` | Missing CRUD functionality |
| Version panel spans full width | `CampaignRow.tsx` line 329 | Visual disconnect from parent row |

---

## New Design: Versions as Table Sub-Rows

### Visual Structure

```text
┌─────┬──────────────────┬────────────┬──────────┬──────────┬─────────┐
│ ☐   │ Campaign Name    │ LP         │ Entities │ Versions │ Actions │
├─────┼──────────────────┼────────────┼──────────┼──────────┼─────────┤
│ ☐   │ ▼ Gold           │ hjl        │ UAE      │ 2        │ 🗑️      │ ← Click row to expand
├─────┼──────────────────┼────────────┼──────────┼──────────┼─────────┤
│     │   └ V2 Jan 26    │ [image]    │ USPs ver │ Hadican  │ ✏️ 🗑️   │ ← Version sub-row
│     │   └ V1 Jan 22    │ [image]    │ Initial  │ Hadican  │ ✏️ 🗑️   │ ← Version sub-row
│     │   └ ➕ Add New   │            │          │          │         │ ← Add version row
├─────┼──────────────────┼────────────┼──────────┼──────────┼─────────┤
│ ☐   │ ▶ Hamilton       │ example.   │ -        │ 0        │ 🗑️      │ ← Collapsed
└─────┴──────────────────┴────────────┴──────────┴──────────┴─────────┘
```

### Key Improvements

1. **Clickable Row**: Click anywhere on the row (except inputs/buttons) to expand/collapse
2. **Version Sub-Rows**: Each version is a proper table row with:
   - Indent indicator (└)
   - Version number badge (V1, V2)
   - Thumbnail image
   - Version notes (truncated)
   - Creator name
   - Edit & Delete buttons
3. **Inline Add Version**: Last sub-row has quick-add form
4. **Consistent Styling**: Sub-rows use lighter background to show hierarchy

---

## Implementation Details

### 1. CampaignRow.tsx Changes

**Make row clickable:**
```typescript
const handleRowClick = (e: React.MouseEvent) => {
  // Don't expand if clicking interactive elements
  const target = e.target as HTMLElement;
  if (target.closest('input, button, [role="button"], [data-no-expand]')) {
    return;
  }
  setIsExpanded(!isExpanded);
};

<tr onClick={handleRowClick} className="cursor-pointer ...">
```

**Replace VersionInlinePanel with sub-rows:**
```tsx
{isExpanded && (
  <>
    {versions.map(version => (
      <VersionSubRow 
        key={version.id}
        version={version}
        onEdit={handleEditVersion}
        onDelete={handleDeleteVersion}
      />
    ))}
    <AddVersionRow 
      campaignId={campaign.id}
      onAdd={handleAddVersion}
    />
  </>
)}
```

### 2. New Component: VersionSubRow.tsx

```typescript
interface VersionSubRowProps {
  version: CampaignVersion;
  onEdit: (version: CampaignVersion) => void;
  onDelete: (versionId: string) => void;
}

export function VersionSubRow({ version, onEdit, onDelete }: VersionSubRowProps) {
  return (
    <tr className="bg-muted/20 border-b border-border/50">
      <td></td> {/* Empty checkbox column */}
      <td className="p-sm pl-lg">
        <div className="flex items-center gap-sm">
          <span className="text-muted-foreground">└</span>
          <Badge variant="outline" className="text-[10px]">V{version.version_number}</Badge>
          <span className="text-body-sm">{version.version_notes || 'No notes'}</span>
        </div>
      </td>
      <td className="p-sm">
        {version.image_url || version.asset_link ? (
          <img src={version.image_url || version.asset_link} className="w-10 h-10 rounded object-cover" />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
            <ImageIcon className="size-4 text-muted-foreground" />
          </div>
        )}
      </td>
      <td className="p-sm text-body-sm text-muted-foreground">
        {version.creator_name || 'Unknown'}
      </td>
      <td className="p-sm text-body-sm text-muted-foreground">
        {format(new Date(version.created_at), 'MMM d, yyyy')}
      </td>
      <td className="p-sm">
        <div className="flex items-center gap-xs">
          <Button variant="ghost" size="icon" className="size-6" onClick={() => onEdit(version)}>
            <Pencil className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => onDelete(version.id)}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
```

### 3. New Component: AddVersionRow.tsx

Inline quick-add form as a table row:

```typescript
interface AddVersionRowProps {
  campaignId: string;
  campaignName: string;
  onVersionAdded: () => void;
}

export function AddVersionRow({ campaignId, campaignName, onVersionAdded }: AddVersionRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [notes, setNotes] = useState("");
  const [assetLink, setAssetLink] = useState("");
  const { createVersion } = useCampaignVersions();
  
  // Shows either "Add Version" button or inline form
  // When form is shown, has notes input + asset URL input + Save/Cancel buttons
}
```

### 4. Edit Version Dialog

Simple dialog for editing version notes and asset link:

```typescript
interface EditVersionDialogProps {
  version: CampaignVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { versionNotes?: string; assetLink?: string }) => void;
}
```

### 5. Version Delete Confirmation

Add delete confirmation before removing versions:

```typescript
// In CampaignRow or as shared component
const [deleteVersionId, setDeleteVersionId] = useState<string | null>(null);

<AlertDialog open={!!deleteVersionId} onOpenChange={() => setDeleteVersionId(null)}>
  <AlertDialogContent>
    <AlertDialogTitle>Delete Version?</AlertDialogTitle>
    <AlertDialogDescription>
      This will permanently delete this version. This action cannot be undone.
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleDeleteVersion(deleteVersionId!)}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/campaigns/VersionSubRow.tsx` | Individual version as table row |
| `src/components/campaigns/AddVersionRow.tsx` | Inline add version form |
| `src/components/campaigns/EditVersionDialog.tsx` | Edit version modal |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/campaigns/CampaignRow.tsx` | Make row clickable, replace VersionInlinePanel with sub-rows, add version CRUD handlers |
| `src/components/campaigns/CampaignTable.tsx` | Ensure table structure supports sub-rows properly |
| `src/components/campaigns/VersionInlinePanel.tsx` | Can be deleted or kept for other uses |

---

## Technical Details

### Row Click Handler Logic

```typescript
const handleRowClick = (e: React.MouseEvent) => {
  // Prevent expansion when clicking interactive elements
  const target = e.target as HTMLElement;
  const isInteractive = target.closest(
    'input, button, [role="button"], [role="checkbox"], a, [data-no-expand]'
  );
  if (isInteractive) return;
  
  setIsExpanded(prev => !prev);
};
```

### Version Query Integration

Move versions query into CampaignRow (already partially there via VersionThumbnail):

```typescript
const { useVersions, createVersion, updateVersion, deleteVersion } = useCampaignVersions();
const { data: versions = [], isLoading: versionsLoading } = useVersions(campaign.id);
```

### Invalidation on Version Changes

Ensure version count updates when versions are added/deleted:

```typescript
// In useCampaignVersions mutations
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["campaign-versions"] });
  queryClient.invalidateQueries({ queryKey: ACCOUNT_STRUCTURE_KEYS.versionCounts });
}
```

---

## Expected Behavior

| Action | Result |
|--------|--------|
| Click campaign row | Row expands to show version sub-rows |
| Click expand arrow | Same as clicking row |
| Click checkbox | Toggles selection (no expand) |
| Click campaign name | Enables inline editing (no expand) |
| Click "Add Version" row | Shows inline form with notes + asset URL inputs |
| Submit add form | Creates version, refreshes count, form resets |
| Click version edit icon | Opens edit dialog |
| Click version delete icon | Shows confirmation, then deletes |
| Click outside expanded row | Nothing (stays expanded) |
| Click row again | Collapses version sub-rows |

---

## Implementation Order

1. Create `VersionSubRow.tsx` - display single version as table row
2. Create `AddVersionRow.tsx` - inline add form as table row
3. Create `EditVersionDialog.tsx` - edit version modal
4. Update `CampaignRow.tsx` - make row clickable, integrate sub-rows
5. Update `useCampaignVersions.ts` - add version count invalidation
6. Test all CRUD operations end-to-end
