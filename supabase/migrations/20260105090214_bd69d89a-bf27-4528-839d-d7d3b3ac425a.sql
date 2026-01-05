-- Add parent_id column for subtask hierarchy
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Create index for efficient subtask queries
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_id);

-- RLS policy for subtasks (users can access subtasks if they can access the parent)
CREATE POLICY "subtasks_inherit_parent_access" ON public.tasks
  FOR ALL USING (
    parent_id IS NULL 
    OR parent_id IN (SELECT id FROM public.tasks WHERE created_by = auth.uid())
    OR parent_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.task_assignees ta ON ta.task_id = t.id
      JOIN public.profiles p ON p.id = ta.user_id
      WHERE p.user_id = auth.uid()
    )
  );