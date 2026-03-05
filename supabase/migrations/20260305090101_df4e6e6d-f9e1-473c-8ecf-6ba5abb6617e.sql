-- Drop the overly permissive UPDATE and DELETE policies
DROP POLICY "All authenticated users can update tasks" ON public.tasks;
DROP POLICY "All authenticated users can delete tasks" ON public.tasks;

-- Restricted UPDATE: creator, assignee, or admin
CREATE POLICY "Task update by creator, assignee, or admin"
ON public.tasks FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    JOIN public.profiles p ON p.id = ta.user_id
    WHERE ta.task_id = tasks.id AND p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    JOIN public.profiles p ON p.id = ta.user_id
    WHERE ta.task_id = tasks.id AND p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Restricted DELETE: creator, assignee, or admin
CREATE POLICY "Task delete by creator, assignee, or admin"
ON public.tasks FOR DELETE TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.task_assignees ta
    JOIN public.profiles p ON p.id = ta.user_id
    WHERE ta.task_id = tasks.id AND p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);