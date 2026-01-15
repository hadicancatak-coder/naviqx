-- Add is_collaborative flag to tasks (for multi-assignee tasks)
ALTER TABLE public.tasks 
ADD COLUMN is_collaborative BOOLEAN NOT NULL DEFAULT false;

-- Add completed_at to task_assignees to track individual completion
ALTER TABLE public.task_assignees 
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.is_collaborative IS 'When true, all assignees must mark complete for task to be completed';
COMMENT ON COLUMN public.task_assignees.completed_at IS 'When this assignee marked the task as complete (for collaborative tasks)';