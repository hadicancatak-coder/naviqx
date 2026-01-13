-- Migration: Convert existing recurring tasks to templates
-- Step 1: Mark existing recurring tasks as templates and set next_run_at
UPDATE tasks
SET 
  is_recurrence_template = true,
  next_run_at = COALESCE(due_at, NOW() + INTERVAL '1 day'),
  occurrence_count = 0
WHERE recurrence_rrule IS NOT NULL 
  AND is_recurrence_template IS NOT TRUE
  AND template_task_id IS NULL
  AND status != 'Completed';

-- Step 2: Create task instances from recurring_task_completions
-- This converts historical daily completions into actual completed task rows
INSERT INTO tasks (
  title, 
  description, 
  priority, 
  status, 
  due_at, 
  created_by, 
  entity, 
  labels, 
  project_id,
  template_task_id, 
  occurrence_date,
  task_type,
  visibility,
  created_at
)
SELECT 
  t.title,
  t.description,
  t.priority,
  'Completed',
  c.completed_date::timestamp with time zone,
  t.created_by,
  t.entity,
  t.labels,
  t.project_id,
  t.id,
  c.completed_date,
  'recurring',
  'global',
  c.completed_at
FROM recurring_task_completions c
JOIN tasks t ON t.id = c.task_id
WHERE NOT EXISTS (
  -- Don't duplicate if instance already exists
  SELECT 1 FROM tasks existing 
  WHERE existing.template_task_id = t.id 
    AND existing.occurrence_date = c.completed_date
);

-- Step 3: Copy assignees from templates to migrated instances
INSERT INTO task_assignees (task_id, user_id, assigned_by)
SELECT 
  new_task.id,
  ta.user_id,
  ta.assigned_by
FROM tasks new_task
JOIN tasks template ON template.id = new_task.template_task_id
JOIN task_assignees ta ON ta.task_id = template.id
WHERE new_task.template_task_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM task_assignees existing
    WHERE existing.task_id = new_task.id AND existing.user_id = ta.user_id
  );