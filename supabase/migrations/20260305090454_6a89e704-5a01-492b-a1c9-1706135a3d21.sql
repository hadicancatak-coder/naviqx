-- (1) Drop duplicate SELECT policy on task_assignees
DROP POLICY "Task assignees viewable by all authenticated" ON public.task_assignees;

-- (2) Fix broken p.id = p.user_id condition in task_assignees DELETE
DROP POLICY "Admins and task creators can remove assignees" ON public.task_assignees;
CREATE POLICY "Admins and task creators can remove assignees"
ON public.task_assignees FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_assignees.task_id AND t.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = task_assignees.user_id AND p.user_id = auth.uid()
  )
);

-- (3) Fix task_activity_log INSERT from true/{public} to auth check/{authenticated}
DROP POLICY "System can insert activity logs" ON public.task_activity_log;
CREATE POLICY "System can insert activity logs"
ON public.task_activity_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);