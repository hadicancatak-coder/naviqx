
# Task Panel UX Improvements + Comment Attachments

## Overview

Based on the user's screenshot and feedback, this plan addresses:
1. **Title too small** - Make it more prominent
2. **Priority/Status/Due alignment** - Fix the awkward horizontal layout in the Priority Card
3. **Comments not visible on task rows** - Show comment count indicator in TaskRow
4. **Comment attachments** - Allow attaching files (<2MB) and links to comments

---

## Issues Identified from Screenshot

The current Priority Card layout shows:
- High | Due today | Ongoing - all in a row with inconsistent sizing
- They wrap awkwardly and don't align properly
- The "Due today" badge isn't visually distinct enough

The title is using `text-heading-md` (20px) which feels small for the main task title.

---

## Part 1: Larger Task Title

**Current:** `text-heading-md font-semibold` (20px)
**New:** `text-heading-lg font-semibold` (24px)

**File:** `src/components/tasks/TaskDetail/TaskDetailFields.tsx`

```typescript
// Change from:
className="text-heading-md font-semibold ..."

// To:
className="text-heading-lg font-semibold ..."
```

---

## Part 2: Priority Card Alignment Fix

**Current Structure:**
```text
┌────────────────────────────────────────────────┐
│ [🏴 High ▼] [📅 Due today] [⏱ Ongoing ▼]       │
└────────────────────────────────────────────────┘
```

**Problems:**
- Flex wrap causes awkward line breaks
- Badges have inconsistent widths
- No visual separation between urgency (overdue warning) and metadata

**New Structure - Vertical Stack with Consistent Width:**
```text
┌────────────────────────────────────────────────┐
│ Priority    ▶ [🏴 High            ▼]           │
│ Due Date    ▶ [⚠️ Overdue (Jan 25)   ]         │
│ Status      ▶ [⏱ Ongoing          ▼]           │
└────────────────────────────────────────────────┘
```

**Alternative - Horizontal with Fixed Grid:**
Use CSS Grid with 3 equal columns that don't wrap:

```typescript
<div className="grid grid-cols-3 gap-sm p-sm rounded-lg bg-card border border-border">
  {/* Priority */}
  <div className="flex flex-col gap-xs">
    <span className="text-metadata text-muted-foreground">Priority</span>
    <Select.../>
  </div>
  
  {/* Due Date */}
  <div className="flex flex-col gap-xs">
    <span className="text-metadata text-muted-foreground">Due</span>
    <DatePicker.../>
  </div>
  
  {/* Status */}
  <div className="flex flex-col gap-xs">
    <span className="text-metadata text-muted-foreground">Status</span>
    <Select.../>
  </div>
</div>
```

This ensures:
- Equal column widths - no awkward wrapping
- Clear labels above each field
- Consistent alignment

**File:** `src/components/tasks/TaskDetail/TaskDetailPriorityCard.tsx`

---

## Part 3: Show Comment Count on Task Rows

The `useTasks` hook already fetches `comments_count` via the materialized view `task_comment_counts`. We just need to display it in TaskRow.

**Current TaskRow Props:**
```typescript
interface TaskRowProps {
  task: any;
  subtaskCount?: number;
  subtaskCompletedCount?: number;
  // ... no comment count
}
```

**Changes:**

1. Add comment count to TaskRow display (no new prop needed - it's on `task.comments_count`)

2. Add comment icon badge near subtask badge:

```typescript
// After subtask badge
{task.comments_count > 0 && !compact && (
  <Badge variant="outline" className="text-metadata px-1 py-0 h-4 bg-muted border-border text-muted-foreground flex-shrink-0 rounded-full">
    <MessageCircle className="h-2.5 w-2.5 mr-0.5" />
    {task.comments_count}
  </Badge>
)}
```

**File:** `src/components/tasks/TaskRow.tsx`

---

## Part 4: Comment Attachments (Files + Links)

This requires database changes and UI updates.

### 4a. Database Changes

Add columns to the `comments` table for attachments:

```sql
-- Add attachment support to comments
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Each attachment in the array has this structure:
-- { "type": "file" | "link", "name": "string", "url": "string", "size_bytes": number }
```

Create a new storage bucket for comment attachments:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-attachments', 'comment-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for uploads
CREATE POLICY "Authenticated users can upload comment attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comment-attachments');

-- RLS policy for reading
CREATE POLICY "Anyone can view comment attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comment-attachments');

-- RLS policy for deleting own files
CREATE POLICY "Users can delete their own comment attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comment-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 4b. Comment Input UI Changes

**File:** `src/components/tasks/TaskDetail/TaskDetailCommentInput.tsx`

Add:
1. File upload button (paperclip icon)
2. Link input button (link icon)
3. Preview area for pending attachments
4. File size validation (2MB limit with warning)

```typescript
// New state
const [pendingAttachments, setPendingAttachments] = useState<Array<{
  type: 'file' | 'link';
  name: string;
  file?: File;
  url?: string;
  size_bytes?: number;
}>>([]);

// File input handler
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  
  if (file.size > MAX_SIZE) {
    toast.warning(
      "File too large", 
      { description: `${file.name} exceeds 2MB. Please add as a link instead.` }
    );
    return;
  }
  
  setPendingAttachments(prev => [...prev, {
    type: 'file',
    name: file.name,
    file,
    size_bytes: file.size
  }]);
};

// Link dialog
const [showLinkDialog, setShowLinkDialog] = useState(false);
const [linkUrl, setLinkUrl] = useState('');
const [linkName, setLinkName] = useState('');

const addLink = () => {
  if (!linkUrl.trim()) return;
  setPendingAttachments(prev => [...prev, {
    type: 'link',
    name: linkName.trim() || linkUrl.trim(),
    url: linkUrl.trim()
  }]);
  setLinkUrl('');
  setLinkName('');
  setShowLinkDialog(false);
};
```

### 4c. Upload Logic in addComment

When submitting a comment with attachments:

1. Upload files to Supabase storage first
2. Get public URLs
3. Include attachments array in comment insert

```typescript
const addComment = async () => {
  // ... existing validation
  
  // Upload files first
  const uploadedAttachments = [];
  for (const attachment of pendingAttachments) {
    if (attachment.type === 'file' && attachment.file) {
      const fileName = `${user.id}/${taskId}/${Date.now()}_${attachment.name}`;
      const { error } = await supabase.storage
        .from('comment-attachments')
        .upload(fileName, attachment.file);
      
      if (error) {
        toast.error(`Failed to upload ${attachment.name}`);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('comment-attachments')
        .getPublicUrl(fileName);
      
      uploadedAttachments.push({
        type: 'file',
        name: attachment.name,
        url: publicUrl,
        size_bytes: attachment.size_bytes
      });
    } else if (attachment.type === 'link') {
      uploadedAttachments.push({
        type: 'link',
        name: attachment.name,
        url: attachment.url
      });
    }
  }
  
  // Insert comment with attachments
  const { error } = await supabase
    .from("comments")
    .insert({
      task_id: taskId,
      author_id: user.id,
      body: commentText,
      attachments: uploadedAttachments
    });
  
  // ... rest of logic
  setPendingAttachments([]);
};
```

### 4d. Display Attachments in Comments

**File:** `src/components/tasks/TaskDetail/TaskDetailComments.tsx`

Add attachment display below comment text:

```typescript
{comment.attachments?.length > 0 && (
  <div className="flex flex-wrap gap-xs mt-xs">
    {comment.attachments.map((att: any, i: number) => (
      <a
        key={i}
        href={att.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-xs px-sm py-xs rounded-md text-metadata",
          "bg-muted/50 hover:bg-muted transition-colors",
          att.type === 'file' && "border border-border"
        )}
      >
        {att.type === 'file' ? (
          <Paperclip className="h-3 w-3" />
        ) : (
          <ExternalLink className="h-3 w-3" />
        )}
        <span className="truncate max-w-[150px]">{att.name}</span>
      </a>
    ))}
  </div>
)}
```

---

## Implementation Files

| File | Changes |
|------|---------|
| **Database** | Add `attachments` column to comments, create storage bucket + policies |
| `TaskDetailFields.tsx` | Increase title size to `text-heading-lg` |
| `TaskDetailPriorityCard.tsx` | Restructure to 3-column grid with labels for proper alignment |
| `TaskRow.tsx` | Add comment count badge with MessageCircle icon |
| `TaskDetailCommentInput.tsx` | Add file/link attachment UI with 2MB validation |
| `TaskDetailComments.tsx` | Display attachments with file/link icons |
| `TaskDetailContext.tsx` | Update `addComment` to handle attachments upload |

---

## UI Preview

**Priority Card (After):**
```text
┌────────────────────────────────────────────────┐
│  Priority        Due              Status       │
│ ┌──────────┐  ┌───────────────┐  ┌──────────┐  │
│ │🏴 High ▼ │  │⚠️ Overdue...  │  │⏱ Ongoing▼│  │
│ └──────────┘  └───────────────┘  └──────────┘  │
└────────────────────────────────────────────────┘
```

**Task Row with Comment Badge:**
```text
○ • Task title here                    [💬 3] [👤] Jan 28
```

**Comment Input with Attachments:**
```text
┌────────────────────────────────────────────────┐
│ Write a comment... Use @ to mention            │
│                                                │
│ [📎 report.pdf ×] [🔗 Figma link ×]            │
│                                                │
│ ⌘+Enter to send           [📎] [🔗]    [Send] │
└────────────────────────────────────────────────┘
```

---

## Summary

| Issue | Solution |
|-------|----------|
| Title too small | Change from `text-heading-md` to `text-heading-lg` |
| Priority/Status/Due misaligned | Restructure to 3-column CSS Grid with labels |
| Comments not visible | Add comment count badge to TaskRow |
| Can't attach to comments | Add file upload (2MB limit) + link attachment with storage bucket |
