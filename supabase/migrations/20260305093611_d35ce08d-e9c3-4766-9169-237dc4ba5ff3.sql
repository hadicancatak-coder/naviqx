
-- Add sprint_id FK column to tasks, referencing existing sprints table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES public.sprints(id) ON DELETE SET NULL;

-- Create index for efficient joins
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON public.tasks(sprint_id);
