
# Favicon, Links, Campaign Comments & Task Panel Improvements

## Overview

This plan addresses four issues:
1. **Update favicon** - Replace with the new Naviqx logo
2. **Open links in new tabs** - Ensure links in rich text content always open in new tabs
3. **Fix campaign comment deletion** - The RLS policy only allows admins to delete, but UI shows button for authors too - need to add author deletion policy
4. **Improve task side panel** - Reduce clutter, make priority prominent, separate comments from activity

---

## Part 1: Favicon Update

### Current State
- `index.html` has no favicon link tag
- `public/favicon.ico` exists but is the old/default icon

### Implementation
1. Copy the uploaded image to `public/favicon.png`
2. Add favicon link tag to `index.html`:

```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

### Files
- `index.html` - Add favicon link
- `public/favicon.png` - Copy uploaded image

---

## Part 2: Links Opening in New Tabs

### Current State
The TipTap Link extension (line 46-51 in `useRichTextEditor.ts`) sets `openOnClick: false` but doesn't add `target="_blank"` to the HTML output. When descriptions are rendered in read-only mode, links open in the same tab.

### Fix
Add `target: '_blank'` and `rel: 'noopener noreferrer'` to Link HTMLAttributes:

```typescript
Link.configure({
  openOnClick: false,
  HTMLAttributes: {
    class: 'text-primary underline cursor-pointer hover:text-primary/80',
    target: '_blank',           // ADD
    rel: 'noopener noreferrer', // ADD
  },
}),
```

### Files
- `src/components/editor/useRichTextEditor.ts`

---

## Part 3: Fix Campaign Comment Deletion

### Issue Found
The RLS policy on `utm_campaign_comments` only allows **admins** to delete comments:

```sql
CREATE POLICY "Admins can delete any comment"
  ON public.utm_campaign_comments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

But the UI in `CampaignComments.tsx` shows the delete button for both admins AND comment authors:

```typescript
{(user?.id === comment.author_id || isAdmin) && (
  <Button onClick={() => deleteUtmCampaignComment.mutate(comment.id)}
```

Non-admin authors can see the button but the database rejects their delete request.

### Fix - Database Migration
Add a policy that allows comment authors to delete their own comments:

```sql
-- Allow comment authors to delete their own comments
CREATE POLICY "Users can delete their own campaign comments"
  ON public.utm_campaign_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);
```

### Files
- Database migration (add author delete policy)

---

## Part 4: Task Side Panel Improvements

### Problems Identified
1. **Too cluttered/dense** - All fields stacked with minimal visual hierarchy
2. **Priority info unclear** - Status/Priority/Due Date are small inline badges, easy to miss
3. **Activity/comments confusing** - Mixed timeline of comments and activity logs is hard to follow

### Current Structure
```text
┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│ Badges (Subtask/Recurring)          │
│ TITLE                               │
│ Status | Priority | Due Date        │ ← Small badges
├─────────────────────────────────────┤
│ Assignees, Tags, Project, Sprint    │
│ Created | Updated | Age             │
├─────────────────────────────────────┤
│ Description                         │
├─────────────────────────────────────┤
│ Subtasks                            │
├─────────────────────────────────────┤
│ Activity (mixed comments + logs)    │ ← Confusing
└─────────────────────────────────────┘
```

### New Structure
```text
┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│ TITLE                               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔴 HIGH  │  📅 Jan 28  │ Ongoing│ │ ← Priority Card
│ └─────────────────────────────────┘ │
│                                     │
│ 👤 John, Jane  (inline avatars)     │
├─────────────────────────────────────┤
│ ▼ Description                       │ ← Collapsible
├─────────────────────────────────────┤
│ ▼ Subtasks (3)                      │ ← Collapsible with count
├─────────────────────────────────────┤
│ ▼ Comments (5)                      │ ← SEPARATED
├─────────────────────────────────────┤
│ ▼ Activity Log (collapsed)          │ ← Collapsed by default
├─────────────────────────────────────┤
│ ▼ Details (collapsed)               │ ← Tags, Project, etc.
│   Created | Updated | Age           │
└─────────────────────────────────────┘
```

### Key Changes

#### 1. Create Prominent Priority Card
A visual card at the top showing the three most important fields with visual urgency:

```typescript
<div className="flex items-center gap-sm p-sm rounded-lg bg-card border border-border">
  {/* Priority - Color-coded */}
  <div className={cn(
    "flex items-center gap-xs px-sm py-xs rounded-md font-medium",
    priority === 'High' && 'bg-destructive/15 text-destructive border border-destructive/30',
    priority === 'Medium' && 'bg-primary/15 text-primary border border-primary/30',
    priority === 'Low' && 'border-border text-muted-foreground bg-muted/50'
  )}>
    <Flag className="h-4 w-4" />
    {priority}
  </div>
  
  {/* Due Date - With urgency color */}
  <div className={cn(
    "flex items-center gap-xs px-sm py-xs rounded-md",
    isOverdue && "bg-destructive/10 text-destructive",
    isDueToday && "bg-warning/10 text-warning-text",
    !isOverdue && !isDueToday && "bg-muted/50 text-muted-foreground"
  )}>
    <CalendarIcon className="h-4 w-4" />
    {dueDate ? format(dueDate, "MMM d") : "No due"}
  </div>
  
  {/* Status */}
  <Badge variant="outline" className={getStatusColor(status)}>
    {status}
  </Badge>
</div>
```

#### 2. Separate Comments from Activity Log

**Current:** Single `TaskDetailActivity` mixes comments and system logs into one timeline.

**New Approach:**
- Split into `TaskDetailComments` (chat-style, expanded by default)
- And `TaskDetailActivityLog` (system changes, collapsed by default)

This makes it crystal clear where discussions happen vs. what changed.

#### 3. Move Metadata to Collapsible "Details"

Move these fields into a collapsed "Details" section:
- Project, Phase, Sprint
- Tags
- Created/Updated/Age metadata
- Collaborative mode settings

This reduces visual noise while keeping everything accessible.

#### 4. Make Assignees More Compact

Show assignees as compact avatar row near the title, not in a separate labeled section.

---

## Implementation Files

| File | Changes |
|------|---------|
| `index.html` | Add favicon link tag |
| `public/favicon.png` | Copy uploaded image |
| `src/components/editor/useRichTextEditor.ts` | Add `target: '_blank'` to Link config |
| **Database** | Add RLS policy for authors to delete their own comments |
| `src/components/tasks/TaskDetail/TaskDetailFields.tsx` | Reorganize: Priority Card at top, Details section collapsed |
| `src/components/tasks/TaskDetail/TaskDetailActivity.tsx` | Rename to `TaskDetailComments.tsx`, show only comments |
| `src/components/tasks/TaskDetail/TaskDetailActivityLog.tsx` | NEW - System activity only, collapsed by default |
| `src/components/tasks/TaskDetail/TaskDetailDetails.tsx` | NEW - Collapsible metadata section |
| `src/components/tasks/TaskDetail/index.tsx` | Update section order |

---

## Summary

| Issue | Solution |
|-------|----------|
| Favicon | Copy new image, add link tag to index.html |
| Links not opening in new tab | Add `target: '_blank'` to TipTap Link config |
| Campaign comments not deleting | Add RLS policy for author deletion |
| Panel too cluttered | Move metadata to collapsible "Details" section |
| Priority info unclear | Create prominent Priority Card at top |
| Activity/comments confusing | Separate Comments (expanded) from Activity Log (collapsed) |
