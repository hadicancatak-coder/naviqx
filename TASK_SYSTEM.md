# Task System Architecture

> **Documentation for the Prisma Task Management System components and patterns.**

---

## Overview

The task system follows an Asana-inspired design with compact 30px rows, inline editing, real subtasks stored as task records with `parent_id`, and a side panel detail view.

---

## Core Components

### TaskRow (`src/components/tasks/TaskRow.tsx`)

The foundational task display component used across all task views.

**Props:**
```typescript
interface TaskRowProps {
  task: any;                          // Task object with id, title, status, etc.
  onClick: (taskId: string, task?: any) => void;  // Row click handler
  onComplete?: (taskId: string, completed: boolean) => void;  // Completion toggle
  onDuplicate?: (task: any, e: React.MouseEvent) => void;     // Duplicate action
  onDelete?: (taskId: string) => void;             // Delete action
  isSelected?: boolean;               // Selection state for bulk actions
  onSelect?: (taskId: string, selected: boolean) => void;  // Selection handler
  showSelectionCheckbox?: boolean;    // Show/hide selection checkbox
  showDragHandle?: boolean;           // Show/hide drag handle
  dragHandleProps?: any;              // Props for dnd-kit drag handle
  compact?: boolean;                  // Hide badges in compact mode
  processingAction?: { taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null;
  userRole?: string | null;           // User role for permission-based actions
}
```

**Styling:**
- Height: `h-row-compact` (30px)
- Horizontal padding: `px-sm`
- Gap between elements: `gap-xxs`
- Avatar size: 20px (h-5 w-5)
- Badge size: h-4 with text-[9px]

**Usage:**
```tsx
<TaskRow
  task={task}
  onClick={handleTaskClick}
  onComplete={handleComplete}
  onDuplicate={handleDuplicate}
  onDelete={handleDelete}
  showSelectionCheckbox
  isSelected={selectedIds.includes(task.id)}
  onSelect={handleSelect}
/>
```

---

### ViewSwitcher (`src/components/tasks/ViewSwitcher.tsx`)

Tab-style view switcher for toggling between List, Board, Timeline, and Tags views.

**Props:**
```typescript
type ViewMode = 'table' | 'kanban-status' | 'kanban-date' | 'kanban-tags';

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}
```

**Styling:**
- Background: `bg-muted` with `p-xxs`
- Active tab: `bg-card` with shadow
- Button height: `h-row-compact` (30px)

**Usage:**
```tsx
<ViewSwitcher 
  value={viewMode} 
  onChange={(mode) => {
    setViewMode(mode);
    if (mode === 'kanban-status') setBoardGroupBy('status');
  }} 
/>
```

---

### InlineTaskCreator (`src/components/tasks/InlineTaskCreator.tsx`)

Inline task creation component that appears at the bottom of task lists.

**Props:**
```typescript
interface InlineTaskCreatorProps {
  onTaskCreated?: () => void;  // Callback after task is created
  className?: string;          // Additional CSS classes
}
```

**Behavior:**
- Click "+ Add task" to show input
- Press Enter to save task
- Press Escape to cancel
- Blurs away if input is empty

**Usage:**
```tsx
<InlineTaskCreator 
  onTaskCreated={refetch} 
  className="border-t border-border" 
/>
```

---

### TasksTable (`src/components/TasksTable.tsx`)

Main table component that renders a list of TaskRow components with grouping support.

**Props:**
```typescript
interface TasksTableProps {
  tasks: any[];
  onTaskUpdate: () => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  groupBy?: 'none' | 'dueDate' | 'priority' | 'assignee' | 'tags';
  onTaskClick?: (taskId: string, task?: any) => void;
}
```

**Features:**
- Renders TaskRow for each task
- Supports grouping with collapsible sections
- Includes header row with select-all checkbox
- Integrates InlineTaskCreator at bottom
- Delete confirmation dialog

---

## Design Tokens

### Row Heights
```css
--row-compact: 1.875rem;     /* 30px - task rows, table rows */
--row-default: 2.25rem;      /* 36px - standard interactive rows */
--row-comfortable: 2.5rem;   /* 40px - spacious rows */
```

### Spacing
```css
--space-xxs: 0.25rem;        /* 4px - tight spacing within rows */
--space-xs: 0.5rem;          /* 8px - small gaps */
--space-sm: 0.75rem;         /* 12px - default padding */
--space-md: 1rem;            /* 16px - section gaps */
```

---

## Keyboard Navigation

The task system supports comprehensive keyboard shortcuts:

| Key | Action |
|-----|--------|
| `j` / `↓` | Move focus down |
| `k` / `↑` | Move focus up |
| `Enter` | Open focused task in side panel |
| `Escape` | Close side panel / clear selection / unfocus |
| `n` | Open new task dialog |
| `x` | Toggle selection on focused task |
| `Shift+x` | Range select from last selected to focused |
| `Space` | Complete focused task |
| `Cmd/Ctrl+a` | Select all visible tasks |

### Visual Focus
Focused rows display with `ring-2 ring-inset ring-primary/50` for clear visibility.

### Shift+Click Selection
Hold Shift and click a task to select all tasks between the last selected and clicked task.

---

## Patterns

### Opening Side Panel
```tsx
const handleTaskClick = useCallback((taskId: string, task?: any) => {
  setSelectedTaskId(taskId);
  setSelectedTask(task || null);
}, []);
```

### Bulk Selection
```tsx
const handleSelect = (taskId: string, selected: boolean) => {
  onSelectionChange?.(
    selected 
      ? [...selectedIds, taskId]
      : selectedIds.filter(id => id !== taskId)
  );
};
```

### Range Selection (Shift+Click)
```tsx
const handleShiftSelect = (taskId: string, shiftKey: boolean) => {
  if (shiftKey && lastSelectedIndex !== null) {
    const rangeIds = paginatedTasks.slice(start, end + 1).map(t => t.id);
    setSelectedTaskIds([...new Set([...selectedTaskIds, ...rangeIds])]);
  }
};
```

### Grouping Logic
Groups are sorted by `order` property:
- Priority: High=0, Medium=1, Low=2
- Due Date: Overdue=0, Today=1, Tomorrow=2, This Week=3, Later=4, No Date=99
- Assignee: Named=0, Unassigned=99
- Tags: Tagged=0, Untagged=99
