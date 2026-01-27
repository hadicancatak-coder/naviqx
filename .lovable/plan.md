
# Comprehensive Fix: Campaign Review Layout, User Names, Version Editing, Comments & Task Icons

## Issues Identified from Screenshot & Analysis

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| **External page overlapping elements** | Missing proper spacing between sections (mb-lg between filter bar, grid, feedback) | Visual mess |
| **VersionCard shows UUID** | `created_by` displays raw user ID, not joined with profiles | User sees "6496321c-9988-4e26..." |
| **Can't edit versions** | No edit button/functionality in VersionCard | Users can't modify version notes/links |
| **Can't delete comments** | Delete button only shows for author, not admins | Admins can't moderate |
| **Task cards missing comment icons** | `TaskBoardView.tsx` and `SortableTaskCard.tsx` don't show `comments_count` | Users can't see at-a-glance which tasks have discussions |

---

## Part 1: Fix CampaignReview.tsx Layout Spacing

**Problem**: The filter bar, campaign grid, detail panel, and entity feedback section are all stacking without proper spacing, causing visual overlap.

**Current structure** (lines 450-717):
- Container uses `py-lg px-md` but children don't have proper bottom margins
- FilterBar immediately followed by campaign grid with no gap
- ExternalCampaignGrid has no bottom margin
- Entity Feedback Card stacks too close

**Fix**: Add consistent `space-y-lg` wrapper and proper margins:

```typescript
// Line ~450: Add space-y-lg to main container
<div className="container mx-auto py-lg px-md space-y-lg">
```

Also ensure each major section has proper containment:
- Identification bar: `mb-lg`
- FilterBar: proper gap below
- Campaign Grid + Detail Panel: wrapped in `space-y-md`
- Entity Feedback: natural spacing from `space-y-lg`

---

## Part 2: Fix VersionCard - Show User Name Instead of UUID

**Files to modify:**
- `src/hooks/useCampaignVersions.ts` - Fetch profile name alongside version
- `src/components/campaigns/VersionCard.tsx` - Display name properly

**Changes in useCampaignVersions.ts:**

Update the interface and query to include creator profile:

```typescript
export interface CampaignVersion {
  // ... existing fields
  created_by: string | null;
  creator_name?: string | null; // NEW FIELD
}

// In useVersions query:
const { data, error } = await supabase
  .from("utm_campaign_versions")
  .select("*")
  .eq("utm_campaign_id", campaignId)
  .order("version_number", { ascending: false });

if (error) throw error;

// Fetch profiles for creators
const creatorIds = [...new Set((data || []).map(v => v.created_by).filter(Boolean))];
let profileMap = new Map();

if (creatorIds.length > 0) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, name")
    .in("user_id", creatorIds);
  
  profileMap = new Map((profiles || []).map(p => [p.user_id, p.name]));
}

return (data || []).map(version => ({
  ...version,
  creator_name: profileMap.get(version.created_by) || null,
})) as CampaignVersion[];
```

**Update VersionCard.tsx line 64-69:**

```typescript
// Replace UUID display with name
{version.creator_name && (
  <span className="text-metadata text-muted-foreground flex items-center gap-1">
    <User className="size-3" />
    {version.creator_name}
  </span>
)}
```

---

## Part 3: Add Edit Button to VersionCard

**File**: `src/components/campaigns/VersionCard.tsx`

Add edit functionality with inline editing:

```typescript
interface VersionCardProps {
  version: CampaignVersion;
  campaignId: string;
  onDelete: (versionId: string) => void;
  onEdit: (versionId: string, data: { versionNotes?: string; assetLink?: string }) => void; // NEW
  isDeleting?: boolean;
  isEditing?: boolean; // NEW
}

// Inside component:
const [editing, setEditing] = useState(false);
const [editNotes, setEditNotes] = useState(version.version_notes || "");
const [editAssetLink, setEditAssetLink] = useState(version.asset_link || "");

// Add Edit button next to Delete (line ~71-79):
<div className="flex items-center gap-1">
  <Button
    variant="ghost"
    size="icon-xs"
    onClick={() => setEditing(true)}
    className="text-muted-foreground hover:text-foreground"
  >
    <Edit className="size-3.5" />
  </Button>
  <Button
    variant="ghost"
    size="icon-xs"
    onClick={() => onDelete(version.id)}
    disabled={isDeleting}
    className="text-destructive hover:text-destructive hover:bg-destructive/10"
  >
    <Trash2 />
  </Button>
</div>

// Inline edit form (replace static notes display when editing):
{editing ? (
  <div className="space-y-sm">
    <Textarea
      value={editNotes}
      onChange={(e) => setEditNotes(e.target.value)}
      placeholder="Version notes..."
      className="min-h-[60px]"
    />
    <Input
      value={editAssetLink}
      onChange={(e) => setEditAssetLink(e.target.value)}
      placeholder="Asset link URL..."
    />
    <div className="flex gap-sm">
      <Button size="sm" onClick={() => {
        onEdit(version.id, { versionNotes: editNotes, assetLink: editAssetLink });
        setEditing(false);
      }}>Save</Button>
      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
    </div>
  </div>
) : (
  // existing notes display
)}
```

Also need to wire up `onEdit` prop in parent component (UtmCampaignDetailDialog).

---

## Part 4: Fix Comment Delete Button (Allow Admins)

**File**: `src/components/campaigns/VersionComments.tsx`

**Current (line 139-148):**
```typescript
{!comment.is_external && user?.id === comment.author_id && (
  <Button ...>
    <Trash2 />
  </Button>
)}
```

**Fixed - Allow admins to delete any internal comment:**
```typescript
{!comment.is_external && (user?.id === comment.author_id || isAdmin) && (
  <Button
    variant="ghost"
    size="icon-xs"
    onClick={() => deleteComment.mutate(comment.id)}
    className="text-destructive hover:text-destructive hover:bg-destructive/10"
  >
    <Trash2 />
  </Button>
)}
```

The `isAdmin` is already available from `useUserRole()` hook (line 33).

---

## Part 5: Add Comment Icons to Task Board & Card Views

**File 1: `src/components/tasks/TaskBoardView.tsx`**

Add import at top:
```typescript
import { MessageCircle } from "lucide-react";
```

Update the bottom row (around line 160-188) to include comment count:

```typescript
{/* Bottom Row: Assignees + Comments + Due */}
<div className="flex items-center justify-between mt-2 pl-4">
  {/* Assignees */}
  <div className="flex -space-x-1">
    {task.assignees?.slice(0, 2).map((a: any) => (
      // ... existing avatar code
    ))}
  </div>

  {/* Comments + Due Date */}
  <div className="flex items-center gap-2">
    {task.comments_count > 0 && (
      <span className="text-metadata text-muted-foreground flex items-center gap-0.5">
        <MessageCircle className="h-3 w-3" />
        {task.comments_count}
      </span>
    )}
    {task.due_at && (
      <span className={cn(
        "text-metadata tabular-nums",
        overdue ? "text-destructive font-medium" : "text-muted-foreground"
      )}>
        {format(new Date(task.due_at), 'MMM d')}
      </span>
    )}
  </div>
</div>
```

**File 2: `src/components/tasks/SortableTaskCard.tsx`**

Add import at top:
```typescript
import { MessageCircle } from "lucide-react";
```

Update the bottom section (around line 116-140):

```typescript
<div className="flex items-center justify-between mt-sm">
  <div className="flex -space-x-2">
    {/* existing assignee avatars */}
  </div>
  
  <div className="flex items-center gap-2">
    {task.comments_count > 0 && (
      <span className="text-metadata text-muted-foreground flex items-center gap-0.5">
        <MessageCircle className="h-3 w-3" />
        {task.comments_count}
      </span>
    )}
    {task.due_at && (
      <span className={cn(
        "text-metadata",
        isOverdue(task.due_at, task.status) && "text-destructive font-medium"
      )}>
        {format(new Date(task.due_at), 'MMM d')}
      </span>
    )}
  </div>
</div>
```

---

## Implementation Files Summary

| File | Changes |
|------|---------|
| `src/pages/CampaignReview.tsx` | Add `space-y-lg` to container for proper section spacing |
| `src/hooks/useCampaignVersions.ts` | Fetch profiles to get creator names, add `creator_name` field |
| `src/components/campaigns/VersionCard.tsx` | Show creator name instead of UUID, add Edit button with inline editing |
| `src/components/campaigns/VersionComments.tsx` | Allow admins to delete any internal comment |
| `src/components/tasks/TaskBoardView.tsx` | Add comment count icon to task cards |
| `src/components/tasks/SortableTaskCard.tsx` | Add comment count icon to sortable task cards |
| `src/components/campaigns/UtmCampaignDetailDialog.tsx` | Wire up `onEdit` prop to VersionCard |

---

## Visual Result

**CampaignReview BEFORE:**
```text
┌────────────────────────────────────┐
│ Header                             │
├────────────────────────────────────┤
│ [Search] [Grid|List] [Sort]        │ ← No gap
│ ┌────┐ ┌────┐                      │ ← Overlapping
│ │Card│ │Card│                      │
│ └────┘ └────┘                      │
│ ┌──────────────────────────────────┤ ← No gap
│ │ General Feedback Section         │
│ └──────────────────────────────────┘
└────────────────────────────────────┘
```

**CampaignReview AFTER:**
```text
┌────────────────────────────────────┐
│ Header                             │
├────────────────────────────────────┤
│                                    │
│ [Search] [Grid|List] [Sort]        │
│                                    │ ← space-y-lg gap
│ ┌────┐ ┌────┐                      │
│ │Card│ │Card│                      │
│ └────┘ └────┘                      │
│                                    │ ← space-y-lg gap
│ ┌──────────────────────────────────┤
│ │ General Feedback Section         │
│ └──────────────────────────────────┘
└────────────────────────────────────┘
```

**VersionCard - User Name Display:**
```text
BEFORE: 👤 6496321c-9988-4e26-91d3-01e0243caa2c
AFTER:  👤 John Smith
```

**Task Cards with Comment Icons:**
```text
┌─────────────────────────────────┐
│ 🔴 High                    ...  │
│ Task title here                 │
│ 👤👤  💬 3   📅 Jan 28          │ ← NEW comment icon
└─────────────────────────────────┘
```

---

## Testing Checklist

After implementation, verify:
1. ✓ CampaignReview page has proper vertical spacing between sections
2. ✓ Version cards show user names instead of UUIDs  
3. ✓ Can click Edit button on version card and modify notes/link
4. ✓ Admins can delete any internal comment (not just their own)
5. ✓ Task board view shows comment icons on tasks with comments
6. ✓ Sortable task cards show comment icons on tasks with comments
