
-- Drop the redundant second policy
DROP POLICY "Users can unassign from tasks" ON public.task_assignees;

-- Recreate the first policy with the merged assigned_by condition
DROP POLICY "Admins and task creators can remove assignees" ON public.task_assignees;
CREATE POLICY "Admins and task creators can remove assignees" ON public.task_assignees
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid() = assigned_by
    OR EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = task_assignees.task_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = task_assignees.user_id AND p.user_id = auth.uid()
    )
  );
