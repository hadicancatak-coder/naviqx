-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Task update by creator, assignee, or admin" ON public.tasks;

-- Allow all authenticated users to update any task
CREATE POLICY "Authenticated users can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);