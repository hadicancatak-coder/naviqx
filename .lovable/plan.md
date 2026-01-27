
# Unified Comments System: Fixing Tagging, Image Previews & Consistency

## Issues Identified

### 1. **@all Tagging Not Working**
The `@all` option only appears when `assigneeIds.length > 0`. Looking at the code:
- `TaskDetailCommentInput.tsx` passes `selectedAssignees` to `MentionAutocomplete`
- If the task has no assignees yet, or the assignee IDs array is empty, `@all` won't show

**Root cause**: The `selectedAssignees` state may not be properly populated when the context first loads, OR the `assigneeIds` prop is using the wrong property (profile IDs vs auth user IDs).

### 2. **Box Size Inconsistency (Priority Card)**
Looking at your screenshot, the Priority, Due, and Status columns have unequal widths. The current code uses `grid-cols-3` but the content inside each column has different sizing:
- Priority Select uses a fixed badge style
- Due Date button stretches differently
- Status badge has `w-full` but still appears different

**Root cause**: The grid columns are equal, but the inner elements have inconsistent `min-width` and padding that makes them appear misaligned.

### 3. **No Image Previews in Comments**
Current attachment display just shows text badges with icons - no thumbnail previews for images. The code at `TaskDetailComments.tsx:81-106` renders all attachments identically regardless of type.

### 4. **Images Open in New Tab Instead of Same Window**
Current code uses `target="_blank"` for all attachment links. User wants images to open in a lightbox within the same window.

### 5. **Fragmented Comment Components**
There are multiple comment implementations:
- `TaskDetailComments.tsx` + `TaskDetailCommentInput.tsx` (most feature-rich)
- `CampaignComments.tsx` (basic, no mentions/attachments)
- `VersionComments.tsx` (basic, no mentions/attachments)
- `EntityCommentsDialog.tsx` (dialog variant)
- `ExternalVersionGallery.tsx` (inline render)

---

## Solution: Unified Comment System

### Part 1: Fix @all Tagging

**Problem**: `MentionAutocomplete` receives `assigneeIds` as profile IDs, but the `users` array has `user_id` (auth user ID). The filter at line 147 compares `u.user_id` to `assigneeIds`.

**Files to change**: 
- `TaskDetailContext.tsx` - Verify the `selectedAssignees` contains the correct ID type
- `MentionAutocomplete.tsx` - May need to support both ID types

**Fix**:
```typescript
// In TaskDetailCommentInput.tsx - ensure we pass user_id, not profile.id
// Current: assigneeIds={selectedAssignees} 
// selectedAssignees contains profile IDs from task_assignees table

// The users array has user_id from profiles table
// We need to map selectedAssignees (profile IDs) to user_ids

// Solution: Use realtimeAssignees which has the profile data including user_id
const assigneeUserIds = realtimeAssignees.map(a => a.user_id).filter(Boolean);
```

Pass the correct IDs to `MentionAutocomplete`:
```typescript
<MentionAutocomplete
  ...
  assigneeIds={realtimeAssignees.map(a => a.user_id).filter(Boolean)}
/>
```

### Part 2: Fix Priority Card Box Alignment

**Problem**: The 3-column grid has equal column widths, but the inner elements (Select, Button, Badge) have inconsistent styling.

**Fix**: Standardize all three elements to have the same visual treatment:

```typescript
<div className="grid grid-cols-3 gap-sm p-sm rounded-lg bg-card border border-border">
  {/* Each column uses flex flex-col with consistent inner elements */}
  <div className="flex flex-col gap-xs min-w-0">
    <span className="text-metadata text-muted-foreground">Priority</span>
    {/* Use a consistent h-9 button-like container */}
    <div className="h-9 ...">
      ...
    </div>
  </div>
  {/* Repeat for Due and Status with same h-9 height */}
</div>
```

Key changes:
- All three columns use `min-w-0` to prevent overflow
- All inner controls use consistent `h-9` height
- Remove `w-full` on Badge to let grid handle sizing
- Standardize padding on all control elements

### Part 3: Add Image Preview & Lightbox Support

**Create a helper to detect image files:**
```typescript
const isImageAttachment = (attachment: Attachment) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const imageMimeTypes = ['image/'];
  const name = attachment.name.toLowerCase();
  return imageExtensions.some(ext => name.endsWith(ext)) || 
         imageMimeTypes.some(type => attachment.url.includes(type));
};
```

**Update TaskDetailComments.tsx to show image previews:**
```typescript
// Add state for lightbox
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxImages, setLightboxImages] = useState<{url: string; caption?: string}[]>([]);
const [lightboxIndex, setLightboxIndex] = useState(0);

// Separate attachments into images and other files
const imageAttachments = attachments.filter(isImageAttachment);
const otherAttachments = attachments.filter(att => !isImageAttachment(att));

// Render image thumbnails that open lightbox on click
{imageAttachments.length > 0 && (
  <div className="flex flex-wrap gap-xs mt-xs">
    {imageAttachments.map((att, i) => (
      <button
        key={i}
        onClick={() => {
          setLightboxImages(imageAttachments.map(a => ({ url: a.url, caption: a.name })));
          setLightboxIndex(i);
          setLightboxOpen(true);
        }}
        className="relative w-20 h-20 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity"
      >
        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
      </button>
    ))}
  </div>
)}

// Render non-image attachments as before
{otherAttachments.length > 0 && (
  <div className="flex flex-wrap gap-xs mt-xs">
    {/* existing badge rendering */}
  </div>
)}

// Add ImageLightbox at component level
<ImageLightbox 
  images={lightboxImages}
  initialIndex={lightboxIndex}
  open={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
/>
```

### Part 4: Create Unified Comment Components

Create a shared comment system that can be used across all contexts:

**New files:**
1. `src/components/comments/UnifiedCommentList.tsx` - Displays comments with all features
2. `src/components/comments/UnifiedCommentInput.tsx` - Input with mentions + attachments
3. `src/components/comments/types.ts` - Shared types

**UnifiedCommentList props:**
```typescript
interface UnifiedCommentListProps {
  comments: CommentItem[];
  currentUserId?: string;
  onDelete?: (commentId: string) => void;
  isAdmin?: boolean;
  showExternalBadge?: boolean;
  // Display options
  variant?: 'chat' | 'list'; // chat = bubbles, list = traditional rows
}
```

**UnifiedCommentInput props:**
```typescript
interface UnifiedCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  // Mention support
  users?: User[];
  assigneeIds?: string[];
  enableMentions?: boolean;
  // Attachment support
  enableAttachments?: boolean;
  pendingAttachments?: PendingAttachment[];
  onAddAttachment?: (attachment: PendingAttachment) => void;
  onRemoveAttachment?: (index: number) => void;
  maxFileSize?: number; // default 2MB
  // UI
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
}
```

---

## Implementation Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/tasks/TaskDetail/TaskDetailCommentInput.tsx` | **Modify** | Pass correct `user_id` for assignees to fix @all |
| `src/components/tasks/TaskDetail/TaskDetailPriorityCard.tsx` | **Modify** | Standardize h-9 height and min-w-0 on all columns |
| `src/components/tasks/TaskDetail/TaskDetailComments.tsx` | **Modify** | Add image detection, thumbnail preview, and ImageLightbox integration |
| `src/components/comments/UnifiedCommentList.tsx` | **Create** | Unified display component for comments |
| `src/components/comments/UnifiedCommentInput.tsx` | **Create** | Unified input with mentions + attachments |
| `src/components/comments/types.ts` | **Create** | Shared TypeScript types |
| `src/components/comments/utils.ts` | **Create** | Helper for detecting image files |
| `src/components/comments/index.ts` | **Create** | Barrel export |

---

## Detailed Changes

### TaskDetailCommentInput.tsx - Fix @all

```typescript
// Current (broken):
<MentionAutocomplete
  assigneeIds={selectedAssignees} // These are profile.id values
/>

// Fixed:
// Get user_ids from realtimeAssignees context
const { realtimeAssignees } = useTaskDetailContext();

<MentionAutocomplete
  assigneeIds={realtimeAssignees.map(a => a.user_id).filter(Boolean)}
/>
```

### TaskDetailPriorityCard.tsx - Fix Alignment

```typescript
<div className="grid grid-cols-3 gap-sm p-sm rounded-lg bg-card border border-border">
  {/* Priority - standardized container */}
  <div className="flex flex-col gap-xs min-w-0">
    <span className="text-metadata text-muted-foreground">Priority</span>
    <Select value={priority} onValueChange={...}>
      <SelectTrigger className="h-9 border-0 p-0 focus:ring-0 shadow-none">
        <div className={cn(
          "flex items-center gap-xs px-2.5 h-full rounded-md font-medium text-body-sm",
          // Same width constraint for all
          "w-full min-w-0",
          // Colors based on priority
          ...
        )}>
          <Flag className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{priority}</span>
        </div>
      </SelectTrigger>
      ...
    </Select>
  </div>

  {/* Due - same h-9 */}
  <div className="flex flex-col gap-xs min-w-0">
    <span className="text-metadata text-muted-foreground">Due</span>
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-9 w-full gap-xs px-2.5 rounded-md justify-start",
            ...
          )}
        >
          ...
        </Button>
      </PopoverTrigger>
      ...
    </Popover>
  </div>

  {/* Status - same h-9 */}
  <div className="flex flex-col gap-xs min-w-0">
    <span className="text-metadata text-muted-foreground">Status</span>
    <Select value={status} onValueChange={...}>
      <SelectTrigger className="h-9 border-0 p-0 focus:ring-0 shadow-none">
        <Badge variant="outline" className={cn(
          "text-body-sm h-full w-full min-w-0 justify-start px-2.5",
          getStatusColor(status)
        )}>
          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{status}</span>
        </Badge>
      </SelectTrigger>
      ...
    </Select>
  </div>
</div>
```

### TaskDetailComments.tsx - Image Preview with Lightbox

```typescript
import { useState } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { isImageUrl } from "@/components/comments/utils";

// In component:
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxImages, setLightboxImages] = useState<{url: string; caption?: string}[]>([]);
const [lightboxIndex, setLightboxIndex] = useState(0);

// In render, for each comment:
const imageAttachments = attachments.filter(att => isImageUrl(att.url) || isImageUrl(att.name));
const fileAttachments = attachments.filter(att => !isImageUrl(att.url) && !isImageUrl(att.name));

// Image thumbnails (clickable → lightbox)
{imageAttachments.length > 0 && (
  <div className="flex flex-wrap gap-xs mt-xs">
    {imageAttachments.map((att, i) => (
      <button
        key={i}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLightboxImages(imageAttachments.map(a => ({ url: a.url, caption: a.name })));
          setLightboxIndex(i);
          setLightboxOpen(true);
        }}
        className={cn(
          "relative w-16 h-16 rounded-md overflow-hidden border transition-opacity hover:opacity-80",
          isCurrentUser ? "border-primary-foreground/30" : "border-border"
        )}
      >
        <img 
          src={att.url} 
          alt={att.name} 
          className="w-full h-full object-cover"
        />
      </button>
    ))}
  </div>
)}

// Non-image attachments (existing badge style)
{fileAttachments.length > 0 && (
  <div className="flex flex-wrap gap-xs mt-xs">
    {/* existing link badges */}
  </div>
)}

// At end of component, outside the comment loop:
<ImageLightbox 
  images={lightboxImages}
  initialIndex={lightboxIndex}
  open={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
/>
```

---

## Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| @all not working | `assigneeIds` contains `profile.id` but `users` has `user_id` | Map `realtimeAssignees` to their `user_id` values |
| Box sizes different | Inner elements have inconsistent heights/padding | Standardize all to `h-9` with `min-w-0` |
| No image previews | All attachments rendered as text badges | Detect image URLs, render thumbnail, open in lightbox |
| Images open new tab | Using `target="_blank"` on image links | Use `ImageLightbox` component instead |
| Fragmented comments | Multiple separate implementations | Create unified components for reuse |

This plan fixes all immediate issues and sets up the foundation for a proper unified comment system that can be adopted across all comment contexts in the application.
