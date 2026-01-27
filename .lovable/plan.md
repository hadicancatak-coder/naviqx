
# LP Button Re-Add and Comments Cleanup Feature

## Overview
This plan addresses two requests:
1. **Re-add the LP button** - The LP (Landing Page) button needs to be added to the internal Campaigns Log page for direct access to campaign landing pages
2. **Add option to clean comments** - Ability to delete comments on boards (entity-level) and campaign versions for internal users/admins

---

## Part 1: Re-Add LP Button

### Problem Analysis
The LP button exists in several components for external reviews but is missing or hidden in the internal Campaigns Log page:
- `DraggableCampaignCard.tsx` shows only the hostname, not a clickable "LP" button
- `EntityCampaignTable.tsx` (CampaignTrackingCard) has no LP button at all
- `CampaignListView.tsx` shows the hostname as a link but no prominent "LP" button

### Implementation

#### File 1: `src/components/campaigns/EntityCampaignTable.tsx`
Add an LP button to the CampaignTrackingCard component:

```typescript
// Inside CampaignTrackingCard, after the status badge (around line 121)
// Add LP button if campaign has landing_page
{campaign.landing_page && (() => {
  try {
    const url = new URL(campaign.landing_page);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return (
      <a
        href={campaign.landing_page}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-metadata text-primary hover:underline mt-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="size-3" />
        LP
      </a>
    );
  } catch {
    return null;
  }
})()}
```

#### File 2: `src/components/campaigns/DraggableCampaignCard.tsx`
Make the LP link more prominent - change from just hostname to "LP" button style:

```typescript
// Replace lines 77-89 with a more prominent LP link
{campaign.landing_page && (() => {
  try {
    new URL(campaign.landing_page); // Validate
    return (
      <a
        href={campaign.landing_page}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-metadata text-primary hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3 w-3" />
        View LP
      </a>
    );
  } catch {
    return null;
  }
})()}
```

---

## Part 2: Add Comments Cleanup Options

### Comment Tables in Scope
Based on the campaign system, these tables store comments:
1. **`utm_campaign_version_comments`** - Internal version comments (already has individual delete)
2. **`external_campaign_review_comments`** - External reviewer feedback
3. **`entity_comments`** - Board/entity-level internal comments
4. **`utm_campaign_comments`** - Campaign-level comments

### Feature Design

#### 2.1: Add "Clear All Comments" Button to Version Comments

**File: `src/components/campaigns/VersionComments.tsx`**

Add a "Clear All" button for admins/campaign owners to delete all comments on a version:

```typescript
// Add imports
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
         AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUserRole } from "@/hooks/useUserRole";

// Add state and hook
const [clearDialogOpen, setClearDialogOpen] = useState(false);
const { isAdmin } = useUserRole();

// Add mutation to useVersionComments hook
const clearAllComments = useMutation({...});

// Add UI button in header section
{isAdmin && comments.length > 0 && (
  <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="icon-xs" className="text-destructive">
        <Trash2 />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Clear All Comments</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete all {comments.length} comments. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleClearAll} className="bg-destructive">
          Delete All
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

**File: `src/hooks/useVersionComments.ts`**

Add bulk delete mutation:

```typescript
const clearAllVersionComments = useMutation({
  mutationFn: async (versionId: string) => {
    // Delete internal comments
    const { error: internalError } = await supabase
      .from("utm_campaign_version_comments")
      .delete()
      .eq("version_id", versionId);
    if (internalError) throw internalError;
    
    // Delete external comments for this version
    const { error: externalError } = await supabase
      .from("external_campaign_review_comments")
      .delete()
      .eq("version_id", versionId);
    if (externalError) throw externalError;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["version-comments"] });
    toast.success("All comments cleared");
  },
  onError: (error: any) => {
    toast.error(error.message || "Failed to clear comments");
  },
});
```

#### 2.2: Add "Clear All Comments" to Entity/Board Comments

**File: `src/components/campaigns/EntityCommentsDialog.tsx`**

Add clear all functionality:

```typescript
// Add hook and state
const { isAdmin } = useUserRole();
const [clearDialogOpen, setClearDialogOpen] = useState(false);

// Add clear all handler
const handleClearAll = async () => {
  // Delete internal entity comments
  await supabase.from("entity_comments").delete().eq("entity", entityName);
  // Delete external entity feedback  
  await supabase.from("external_campaign_review_comments")
    .delete().eq("entity", entityName).eq("comment_type", "entity_feedback");
  // Invalidate queries
  queryClient.invalidateQueries({ queryKey: ["entity-comments"] });
  queryClient.invalidateQueries({ queryKey: ["external-entity-comments"] });
  setClearDialogOpen(false);
};

// Add button in header (for admins only)
{isAdmin && allComments.length > 0 && (
  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setClearDialogOpen(true)}>
    <Trash2 /> Clear All
  </Button>
)}
```

**File: `src/hooks/useEntityComments.ts`**

Add delete mutations for entity comments:

```typescript
const deleteComment = useMutation({
  mutationFn: async (commentId: string) => {
    const { error } = await supabase
      .from("entity_comments")
      .delete()
      .eq("id", commentId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["entity-comments"] });
    toast.success("Comment deleted");
  },
});

const clearAllEntityComments = useMutation({
  mutationFn: async (entityName: string) => {
    const { error } = await supabase
      .from("entity_comments")
      .delete()
      .eq("entity", entityName);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["entity-comments"] });
    toast.success("All entity comments cleared");
  },
});
```

#### 2.3: Add Individual Comment Delete to CampaignComments

**File: `src/components/campaigns/CampaignComments.tsx`**

Add delete button for user's own comments:

```typescript
// Add imports and hook
import { Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// In component
const { user } = useAuth();

// Add mutation to useCampaignComments hook for deletion
// Then add delete button next to each comment (for own comments):
{user?.id === comment.author_id && (
  <Button
    variant="ghost"
    size="icon-xs"
    onClick={() => deleteComment.mutate(comment.id)}
    className="text-destructive"
  >
    <Trash2 />
  </Button>
)}
```

**File: `src/hooks/useCampaignComments.ts`**

Add delete mutations:

```typescript
const deleteUtmCampaignComment = useMutation({
  mutationFn: async (commentId: string) => {
    const { error } = await supabase
      .from("utm_campaign_comments")
      .delete()
      .eq("id", commentId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["utm-campaign-comments"] });
    toast.success("Comment deleted");
  },
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/campaigns/EntityCampaignTable.tsx` | Add LP button to CampaignTrackingCard |
| `src/components/campaigns/DraggableCampaignCard.tsx` | Make LP link more prominent |
| `src/components/campaigns/VersionComments.tsx` | Add delete individual + clear all UI |
| `src/hooks/useVersionComments.ts` | Add clearAllVersionComments mutation |
| `src/components/campaigns/EntityCommentsDialog.tsx` | Add individual delete + clear all UI for admins |
| `src/hooks/useEntityComments.ts` | Add deleteComment and clearAllEntityComments mutations |
| `src/components/campaigns/CampaignComments.tsx` | Add delete button for own comments |
| `src/hooks/useCampaignComments.ts` | Add deleteUtmCampaignComment mutation |

---

## Permission Model

| Action | Who Can Do It |
|--------|---------------|
| Delete own comment | Comment author |
| Clear all version comments | Admin only |
| Clear all entity comments | Admin only |
| Delete any comment | Admin only |

---

## Safety Considerations

1. **URL Validation**: All LP buttons use try-catch URL validation to prevent crashes from malformed database strings
2. **Confirmation Dialogs**: All "Clear All" actions require explicit confirmation via AlertDialog
3. **Admin-Only Bulk Delete**: Only admins can clear all comments to prevent accidental data loss
4. **Individual Delete**: Users can only delete their own comments (enforced in UI and can be backed by RLS)
5. **Query Invalidation**: All delete operations properly invalidate relevant queries to ensure UI stays in sync
