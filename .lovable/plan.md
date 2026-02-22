
# Bulk Task Creation

## Overview
Add a "Bulk Add" mode to the task creation flow, allowing users to quickly add multiple tasks at once with optional descriptions and due dates -- all from a single, clean dialog.

## User Experience

### Entry Point
- Add a small "Bulk add" icon button next to the existing "Add task" row in the `InlineTaskCreator` component
- Clicking it opens a `BulkTaskCreateDialog`

### Dialog Design
- A modal dialog with a dynamic list of task rows
- Each row contains:
  - **Title** (required) -- text input, auto-focused
  - **Due date** (optional) -- compact date picker button (calendar icon, shows date when set)
  - **Description** (optional) -- expandable via a toggle/chevron per row
  - **Remove row** button (X icon)
- A "+ Add another" button at the bottom to append new empty rows
- Pressing **Enter** on a title field automatically adds a new row below (fast keyboard flow)
- Start with 3 empty rows by default
- Footer: "Cancel" and "Create X Tasks" button (disabled until at least 1 title is filled)

### After Creation
- All tasks are inserted in a single batch
- A toast confirms "X tasks created"
- The dialog closes and the task list refreshes

## Technical Details

### New File: `src/components/tasks/BulkTaskCreateDialog.tsx`
- Dialog component using the existing `Dialog` UI primitives
- Internal state: array of `{ title, description, dueDate }` objects
- On submit: filters out empty rows, then calls `supabase.from('tasks').insert([...])` with all valid tasks (status: "Ongoing", priority: "Medium", created_by: user.id)
- Invalidates the `TASK_QUERY_KEY` query after successful insert

### Modified File: `src/components/tasks/InlineTaskCreator.tsx`
- Add a `ListPlus` icon button next to the "Add task" trigger
- Clicking it opens the `BulkTaskCreateDialog`
- Manages `isBulkOpen` state

### Styling
- Uses existing Prisma design tokens (bg-card, border-border, text-body-sm, gap-sm, rounded-lg, etc.)
- Dialog uses `liquid-glass-dialog` styling via the standard `DialogContent`
- Rows have subtle hover states and smooth transitions
- Compact layout to keep the dialog scannable even with many rows
