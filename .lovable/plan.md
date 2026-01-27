
# Comprehensive Fix Plan: Links, UI Alignment, @all Tagging & Comments

## Critical Issues Summary

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Links in descriptions don't open | TipTap editor intercepts clicks even in "view" mode | Users can't navigate to links |
| Buttons not matching | Inconsistent inner element structure in PriorityCard | Visual misalignment |
| @all tagging broken | ID mismatch between profiles and assignees | Can't mention all assignees |
| "Connection not secure" warnings | URLs without `https://` protocol | Browser security warnings |
| Comments not working | Multiple potential issues in comment flow | Comments may not save/display |

---

## Part 1: Fix Links in Descriptions

**Problem**: The RichTextEditor uses TipTap with `openOnClick: false`, which is correct for editing. However, when the editor is not focused or when viewing content, links should still be clickable.

**Root Cause**: TipTap's editor captures all clicks including on links. Even with `target="_blank"` in the HTML, the editor prevents navigation.

**Solution**: Enable link clicking with modifier key OR add a click handler to detect link clicks:

```typescript
// In useRichTextEditor.ts - Update Link configuration
Link.configure({
  openOnClick: true, // Allow clicking links
  linkOnPaste: true,
  HTMLAttributes: {
    class: 'text-primary underline cursor-pointer hover:text-primary/80',
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
  },
}),
```

**Alternative** (if openOnClick causes editing issues): Add event delegation to handle link clicks:

```typescript
// In RichTextEditor.tsx - Add click handler for links
const handleEditorClick = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  const anchor = target.closest('a');
  if (anchor && anchor.href) {
    e.preventDefault();
    window.open(anchor.href, '_blank', 'noopener,noreferrer');
  }
};

// Wrap EditorContent in div with onClick={handleEditorClick}
```

---

## Part 2: Fix Priority Card Alignment

**Problem**: The three columns have different inner element structures causing visual mismatch.

**Current State**:
- Priority: `SelectTrigger` → `div` (badge-like styling)
- Due Date: `Button` (direct)
- Status: `SelectTrigger` → `Badge`

**Solution**: Standardize all three to use identical wrapper structure:

```typescript
// STANDARDIZED STRUCTURE FOR ALL THREE:
<div className="flex flex-col gap-xs min-w-0">
  <span className="text-metadata text-muted-foreground">{label}</span>
  {/* ALL use same container height and padding */}
  <div className={cn(
    "flex items-center gap-xs h-9 px-2.5 rounded-md border font-medium text-body-sm w-full min-w-0",
    getColorClasses(value)
  )}>
    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
    <span className="truncate flex-1">{displayValue}</span>
  </div>
</div>
```

**File**: `src/components/tasks/TaskDetail/TaskDetailPriorityCard.tsx`

Key changes:
1. Remove the Badge wrapper from Status - use same div structure as Priority
2. For Due Date, move Button styling into the same pattern
3. Ensure all three have `h-9`, `px-2.5`, `gap-xs`, `rounded-md`, `border`

---

## Part 3: Fix @all Tagging

**Problem**: The `assigneeUserIds` extraction is not matching the user IDs in the `users` array.

**Diagnosis needed**: Check what `realtimeAssignees` actually contains.

Based on memory context and typical patterns, `realtimeAssignees` comes from `task_assignees` table with joined profile data. The structure is likely:
```typescript
{
  user_id: "profile-table-id",  // This is profile.id, NOT auth user ID
  profiles: {
    id: "profile-table-id",
    user_id: "auth-user-id",    // THIS is what we need
    name: "...",
  }
}
```

**Solution**: Fix the mapping in `TaskDetailCommentInput.tsx`:

```typescript
// CURRENT (broken):
const assigneeUserIds = realtimeAssignees
  .map(a => a.user_id)
  .filter((id): id is string => Boolean(id));

// FIXED: Access the nested profiles.user_id
const assigneeUserIds = realtimeAssignees
  .map(a => a.profiles?.user_id || a.user_id)
  .filter((id): id is string => Boolean(id));
```

Also verify that `users` array contains auth `user_id` values (not profile table IDs).

---

## Part 4: Fix "Connection Not Secure" Warnings

**Problem**: URLs stored without protocol prefix (e.g., "example.com" instead of "https://example.com") trigger browser security warnings.

**Solution**: Add URL normalization helper and apply to all link rendering:

```typescript
// In src/components/comments/utils.ts
export function normalizeUrl(url: string): string {
  if (!url) return url;
  
  // Already has protocol
  if (url.match(/^https?:\/\//i)) {
    return url;
  }
  
  // Has other protocol (mailto:, tel:, etc.)
  if (url.includes('://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
    return url;
  }
  
  // Add https:// prefix
  return `https://${url}`;
}
```

**Apply in TaskDetailComments.tsx**:
```typescript
import { normalizeUrl } from "@/components/comments/utils";

// For file/link attachments
<a href={normalizeUrl(att.url)} target="_blank" rel="noopener noreferrer">
```

**Apply in TaskDetailCommentInput.tsx** when adding links:
```typescript
const handleAddLink = () => {
  if (!linkUrl.trim()) return;
  
  setPendingAttachments((prev) => [...prev, {
    type: 'link',
    name: linkName.trim() || linkUrl.trim(),
    url: normalizeUrl(linkUrl.trim())  // Normalize on add
  }]);
  // ...
};
```

---

## Part 5: Verify Comments Functionality

**Files to check/fix**:

1. **TaskDetailContext.tsx** - Verify `addComment` function handles attachments correctly
2. **Database** - Verify `attachments` column exists on `comments` table
3. **Storage** - Verify `comment-attachments` bucket exists and has correct RLS

**Potential issues**:
- File upload might fail silently
- Comment insert might not include attachments
- Fetch query might not include attachments column

**Solution**: Add comprehensive error handling and logging:

```typescript
// In addComment function
const addComment = async () => {
  if (!newComment.trim() && pendingAttachments.length === 0) return;
  if (!user || !task) return;

  setIsSubmittingComment(true);
  
  try {
    const uploadedAttachments = [];
    
    // Upload files with error handling
    for (const att of pendingAttachments) {
      if (att.type === 'file' && att.file) {
        const fileName = `${user.id}/${task.id}/${Date.now()}_${att.name}`;
        const { error: uploadError } = await supabase.storage
          .from('comment-attachments')
          .upload(fileName, att.file);
        
        if (uploadError) {
          console.error('File upload failed:', uploadError);
          toast.error(`Failed to upload ${att.name}`);
          throw uploadError;
        }
        
        const { data: urlData } = supabase.storage
          .from('comment-attachments')
          .getPublicUrl(fileName);
        
        uploadedAttachments.push({
          type: 'file',
          name: att.name,
          url: urlData.publicUrl,
          size_bytes: att.size_bytes
        });
      } else if (att.type === 'link') {
        uploadedAttachments.push({
          type: 'link',
          name: att.name,
          url: normalizeUrl(att.url!)
        });
      }
    }
    
    // Insert comment with attachments
    const { error: insertError } = await supabase
      .from('comments')
      .insert({
        task_id: task.id,
        author_id: user.id,
        body: newComment.trim(),
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null
      });
    
    if (insertError) {
      console.error('Comment insert failed:', insertError);
      toast.error('Failed to add comment');
      throw insertError;
    }
    
    // Clear state on success
    setNewComment('');
    setPendingAttachments([]);
    await fetchComments();
    
    toast.success('Comment added');
  } catch (error) {
    console.error('addComment error:', error);
  } finally {
    setIsSubmittingComment(false);
  }
};
```

---

## Implementation Files

| File | Changes |
|------|---------|
| `src/components/editor/useRichTextEditor.ts` | Enable `openOnClick: true` for links |
| `src/components/editor/RichTextEditor.tsx` | Add click handler for link navigation fallback |
| `src/components/tasks/TaskDetail/TaskDetailPriorityCard.tsx` | Standardize all three columns to identical structure |
| `src/components/tasks/TaskDetail/TaskDetailCommentInput.tsx` | Fix assignee ID extraction, normalize URLs on add |
| `src/components/tasks/TaskDetail/TaskDetailComments.tsx` | Normalize URLs when rendering links |
| `src/components/tasks/TaskDetail/TaskDetailContext.tsx` | Add error handling to addComment, verify attachment flow |
| `src/components/comments/utils.ts` | Add `normalizeUrl` helper function |

---

## Visual Fixes Summary

**Priority Card BEFORE:**
```text
┌─────────────────────────────────────────────────────┐
│ Priority      Due              Status               │
│ ┌──────┐    ┌──────────────┐  ┌─────────────────┐   │
│ │High▼ │    │ Due today    │  │   Ongoing    ▼ │   │
│ └──────┘    └──────────────┘  └─────────────────┘   │
│  (div)         (Button)          (Badge)            │
└─────────────────────────────────────────────────────┘
```

**Priority Card AFTER:**
```text
┌─────────────────────────────────────────────────────┐
│ Priority        Due              Status             │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ 🚩 High  ▼ │ │ 📅 Due... │ │ ⏱ Ongoing▼│        │
│ └────────────┘ └────────────┘ └────────────┘        │
│  (same div)     (same div)     (same div)           │
└─────────────────────────────────────────────────────┘
```

All three use identical:
- `h-9` height
- `px-2.5` horizontal padding
- `gap-xs` icon spacing
- `rounded-md` corners
- `border` outline
- `flex items-center` layout

---

## Testing Checklist

After implementation, verify:
1. Click links in task descriptions - they should open in new tabs
2. Priority/Due/Status boxes are visually identical in size
3. Type `@a` in comments - "Mention All" option should appear when task has assignees
4. Add a link without `https://` - no security warnings should appear
5. Add a comment with file attachment - file should upload and display
6. Add a comment with link attachment - link should save and be clickable
