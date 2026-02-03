
# Add @Mention Support to Task Descriptions

## Problem

Currently, you can only tag people in **comments** but NOT in task **descriptions**. The description editor (TipTap-based) doesn't have mention functionality, while the comment input (plain textarea) does.

## Current Architecture

| Feature | Comments | Descriptions |
|---------|----------|--------------|
| Editor | `MentionAutocomplete` (textarea) | `RichTextEditor` (TipTap) |
| Mention UI | ✅ Dropdown with @ trigger | ❌ None |
| Storage | `comment_mentions` table | ❌ None |
| Notifications | `notify_comment_mention()` trigger | ❌ None |

---

## Implementation Plan

### Step 1: Install TipTap Mention Extension

Add the official TipTap mention extension package.

**Package**: `@tiptap/extension-mention`

---

### Step 2: Database - Create Description Mentions Table

Create a new table to store description mentions (mirrors `comment_mentions`):

```sql
CREATE TABLE public.description_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioned_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.description_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mentions"
  ON public.description_mentions FOR SELECT
  USING (true);

CREATE POLICY "Task creators and assignees can create mentions"
  ON public.description_mentions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

### Step 3: Database - Create Notification Trigger

Create trigger function to send notifications when someone is mentioned:

```sql
CREATE OR REPLACE FUNCTION public.notify_description_mention()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  mentioner_name TEXT;
BEGIN
  -- Get task details
  SELECT id, title INTO task_record FROM tasks WHERE id = NEW.task_id;
  
  -- Get mentioner's name
  SELECT name INTO mentioner_name FROM profiles WHERE user_id = NEW.mentioned_by;
  
  -- Don't notify if user mentions themselves
  IF NEW.mentioned_user_id = NEW.mentioned_by THEN
    RETURN NEW;
  END IF;
  
  -- Check if notification is enabled
  IF is_notification_enabled(NEW.mentioned_user_id, 'mention') THEN
    INSERT INTO notifications (user_id, type, payload_json)
    VALUES (
      NEW.mentioned_user_id,
      'description_mention',
      jsonb_build_object(
        'task_id', task_record.id,
        'task_title', task_record.title,
        'mentioned_by', NEW.mentioned_by,
        'mentioner_name', mentioner_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_description_mention
  AFTER INSERT ON public.description_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_description_mention();
```

---

### Step 4: Create Mention Suggestion Component

New file: `src/components/editor/MentionSuggestion.tsx`

This component provides the popup UI when user types `@`:
- Fetches all users from profiles
- Filters based on query
- Handles keyboard navigation
- Inserts mention node on selection

---

### Step 5: Update TipTap Editor Configuration

Modify `src/components/editor/useRichTextEditor.ts`:

```typescript
import { Mention } from '@tiptap/extension-mention';
import { suggestionConfig } from './MentionSuggestion';

// Add to extensions array:
Mention.configure({
  HTMLAttributes: {
    class: 'mention',
  },
  suggestion: suggestionConfig,
}),
```

---

### Step 6: Add Mention Styles

Add CSS for mention nodes in `src/index.css`:

```css
.mention {
  background-color: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-weight: 500;
}
```

---

### Step 7: Update Description Mutation

Modify `src/hooks/useTaskMutations.ts` `updateDescription`:

1. Parse HTML for mention nodes: `<span data-mention data-id="user-id">@name</span>`
2. Extract user IDs from mention nodes
3. Compare with existing mentions (delete removed, insert new)
4. Insert new mentions into `description_mentions` table

```typescript
const updateDescription = useMutation({
  mutationFn: async ({ id, description }: { id: string; description: string }) => {
    // 1. Update the task description
    const { data, error } = await supabase
      .from('tasks')
      .update({ description })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    // 2. Parse mentions from HTML
    const mentionPattern = /data-id="([^"]+)"/g;
    const matches = [...description.matchAll(mentionPattern)];
    const mentionedUserIds = matches.map(m => m[1]);
    
    // 3. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // 4. Clear old mentions and insert new ones
    if (mentionedUserIds.length > 0 && user) {
      await supabase.from('description_mentions').delete().eq('task_id', id);
      await supabase.from('description_mentions').insert(
        mentionedUserIds.map(userId => ({
          task_id: id,
          mentioned_user_id: userId,
          mentioned_by: user.id
        }))
      );
    }
    
    return data;
  },
  // ... rest of mutation config
});
```

---

### Step 8: Update Notifications Page

Modify `src/pages/Notifications.tsx` to handle `description_mention` type:

```typescript
case "description_mention":
  return `Mentioned in: ${taskTitle}`;
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/editor/MentionSuggestion.tsx` | TipTap mention suggestion popup |

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add `@tiptap/extension-mention` |
| `src/components/editor/useRichTextEditor.ts` | Add Mention extension |
| `src/index.css` | Add `.mention` styles |
| `src/hooks/useTaskMutations.ts` | Parse mentions in `updateDescription` |
| `src/pages/Notifications.tsx` | Handle `description_mention` type |
| Database migration | Create `description_mentions` table + trigger |

---

## User Experience After Implementation

1. User opens task description editor
2. Types `@` → mention popup appears with user list
3. Filters as user types (e.g., `@joh` filters to "John")
4. Selects user → mention chip inserted: `@John`
5. Saves description → mention stored in `description_mentions`
6. Database trigger fires → notification sent to mentioned user
7. Mentioned user sees notification: "Mentioned in: Task Title"
8. Click notification → opens task detail

---

## Technical Notes

1. **TipTap Mention Extension** stores mentions as special nodes with `data-id` attribute containing user ID
2. **Parsing Strategy**: Extract user IDs from HTML using regex on `data-id` attributes
3. **Mention Comparison**: On each save, we clear and re-insert all mentions (simpler than diffing)
4. **Same notification type**: Uses existing `'mention'` preference for consistency
