

# Version Sub-Rows with Expandable Details + Comments

## Problem Analysis

| Issue | Current Behavior | Expected Behavior |
|-------|-----------------|-------------------|
| **Version rows not clickable** | `VersionSubRow` is static, only shows basic info | Click on version row should expand to show full details |
| **No comments visible** | Comments component exists but not used in table view | Each version should show comments when expanded |
| **No description field** | `description` exists in DB but not editable in UI | Should be editable alongside version notes |

---

## Solution: Expandable Version Detail Panel

### Visual Design

```text
┌─────┬──────────────────┬────────────┬──────────┬──────────┬─────────┐
│ ☐   │ Campaign Name    │ LP         │ Entities │ Versions │ Actions │
├─────┼──────────────────┼────────────┼──────────┼──────────┼─────────┤
│ ☐   │ ▼ Gold           │ hjl        │ UAE      │ 2        │ 🗑️      │ ← Expanded campaign
├─────┼──────────────────┼────────────┼──────────┼──────────┼─────────┤
│     │   ▼ V2 Jan 26    │ [thumb]    │ USPs ver │ Hadican  │ ✏️ 🗑️   │ ← Expanded version
├─────┴──────────────────┴────────────┴──────────┴──────────┴─────────┤
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ [Large Image]              │ Description: Main USPs version    │ │
│  │                            │ Notes: Updated copy for UAE       │ │
│  │                            │ Asset: drive.google.com/...       │ │
│  │                            ├────────────────────────────────────│ │
│  │                            │ 💬 Comments (3)                   │ │
│  │                            │ - John: Great version! ✓          │ │
│  │                            │ - Sarah: Need higher res image    │ │
│  │                            │ [Add comment input]               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
├─────┬──────────────────┬────────────┬──────────┬──────────┬─────────┤
│     │   ▶ V1 Jan 22    │ [thumb]    │ Initial  │ Hadican  │ ✏️ 🗑️   │ ← Collapsed version
├─────┼──────────────────┼────────────┼──────────┼──────────┼─────────┤
│     │   ➕ Add New     │            │          │          │         │
└─────┴──────────────────┴────────────┴──────────┴──────────┴─────────┘
```

---

## Implementation Details

### 1. VersionSubRow.tsx Changes

**Add internal expansion state:**
```typescript
const [isDetailExpanded, setIsDetailExpanded] = useState(false);

// Make the entire row clickable
const handleRowClick = (e: React.MouseEvent) => {
  const isInteractive = (e.target as HTMLElement).closest('button, a, input');
  if (isInteractive) return;
  setIsDetailExpanded(prev => !prev);
};

<tr onClick={handleRowClick} className="cursor-pointer ...">
```

**Add detail panel as second row:**
```tsx
{isDetailExpanded && (
  <tr className="bg-muted/20">
    <td colSpan={6} className="p-md">
      <VersionDetailPanel 
        version={version} 
        campaignId={campaignId}
        onEdit={onEdit}
      />
    </td>
  </tr>
)}
```

### 2. New Component: VersionDetailPanel.tsx

A rich inline panel showing:
- **Large image** with lightbox on click
- **Description** field (editable)
- **Version notes** (displayed)
- **Asset link** with clickable button
- **Comments section** using existing `VersionComments` component

```typescript
interface VersionDetailPanelProps {
  version: CampaignVersion;
  campaignId: string;
  onEdit: (version: CampaignVersion) => void;
}

export function VersionDetailPanel({ version, campaignId, onEdit }: VersionDetailPanelProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  return (
    <div className="flex gap-lg bg-card rounded-lg p-md border border-border/50">
      {/* Image Section */}
      <div className="shrink-0">
        {version.image_url ? (
          <div 
            className="relative group cursor-pointer"
            onClick={() => setLightboxOpen(true)}
          >
            <img 
              src={version.image_url} 
              alt={`V${version.version_number}`}
              className="w-[250px] h-[180px] object-cover rounded-lg border border-border"
            />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 
                            transition-opacity flex items-center justify-center rounded-lg">
              <ZoomIn className="size-8 text-foreground" />
            </div>
          </div>
        ) : (
          <div className="w-[250px] h-[180px] rounded-lg bg-muted flex items-center 
                          justify-center border border-border">
            <ImageIcon className="size-12 text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="flex-1 space-y-md">
        {/* Description */}
        {version.description && (
          <div className="space-y-xs">
            <label className="text-metadata text-muted-foreground">Description</label>
            <p className="text-body">{version.description}</p>
          </div>
        )}
        
        {/* Notes */}
        {version.version_notes && (
          <div className="bg-muted/50 rounded-md p-sm border border-border/50">
            <p className="text-body-sm">{version.version_notes}</p>
          </div>
        )}
        
        {/* Asset Link */}
        {version.asset_link && (
          <a href={version.asset_link} target="_blank" 
             className="inline-flex items-center gap-1 text-primary hover:underline">
            <Link2 className="size-3" />
            View Asset
            <ExternalLink className="size-3" />
          </a>
        )}
        
        {/* Comments */}
        <VersionComments versionId={version.id} campaignId={campaignId} />
      </div>
      
      {/* Lightbox */}
      {version.image_url && (
        <ImageLightbox
          images={[{ url: version.image_url }]}
          initialIndex={0}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
```

### 3. EditVersionDialog.tsx Updates

Add **description** field alongside notes:

```typescript
const [description, setDescription] = useState("");

// In form:
<div className="space-y-sm">
  <Label>Description</Label>
  <Textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="Version description..."
    rows={2}
  />
</div>
```

### 4. useCampaignVersions.ts Updates

Include `description` in update mutation:

```typescript
// In updateVersion mutationFn
const { data, error } = await supabase
  .from("utm_campaign_versions")
  .update({
    version_notes: versionNotes,
    description: description, // Add this
    image_url: imageUrl,
    asset_link: assetLink,
  })
  .eq("id", versionId)
  .select()
  .single();
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/campaigns/VersionDetailPanel.tsx` | Rich inline panel with image, description, notes, asset link, and comments |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/campaigns/VersionSubRow.tsx` | Add expansion state, make row clickable, render detail panel when expanded |
| `src/components/campaigns/EditVersionDialog.tsx` | Add description field to edit form |
| `src/hooks/useCampaignVersions.ts` | Include description in update mutation |
| `src/components/campaigns/AddVersionRow.tsx` | Add description field to creation form |

---

## Technical Details

### Row Click Handler in VersionSubRow

```typescript
const handleRowClick = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  // Don't toggle if clicking edit/delete buttons
  if (target.closest('button, a')) return;
  setIsDetailExpanded(prev => !prev);
};
```

### Props Updates

`VersionSubRow` needs `campaignId` passed down:
```typescript
interface VersionSubRowProps {
  version: CampaignVersion;
  campaignId: string; // Add this
  onEdit: (version: CampaignVersion) => void;
  onDelete: (versionId: string) => void;
}
```

### Visual Hierarchy

- Campaign row: white/card background
- Version sub-row (collapsed): `bg-muted/20`
- Version sub-row (expanded header): `bg-muted/20` 
- Version detail panel: `bg-card border` (slightly elevated)
- Add version row: `bg-muted/10`

---

## Expected Behavior

| Action | Result |
|--------|--------|
| Click on version row | Expands to show detail panel with image, description, notes, asset link, and comments |
| Click on expanded version row | Collapses the detail panel |
| Click edit button on version | Opens edit dialog with description field |
| Click delete button on version | Shows confirmation dialog |
| Click image in detail panel | Opens lightbox |
| Add comment in detail panel | Creates comment via existing `VersionComments` component |
| Click asset link | Opens in new tab |

---

## Implementation Order

1. Create `VersionDetailPanel.tsx` - the rich expandable content
2. Update `VersionSubRow.tsx` - add expansion state and detail panel
3. Update `EditVersionDialog.tsx` - add description field
4. Update `AddVersionRow.tsx` - add description field  
5. Update `useCampaignVersions.ts` - include description in mutations
6. Update `CampaignRow.tsx` - pass campaignId to VersionSubRow

