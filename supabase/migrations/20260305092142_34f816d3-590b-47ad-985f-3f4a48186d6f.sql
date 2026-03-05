
-- Fix "Admins can manage activity logs" from {public} to {authenticated}
DROP POLICY "Admins can manage activity logs" ON public.task_activity_log;
CREATE POLICY "Admins can manage activity logs" ON public.task_activity_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix "Authenticated users can view activity logs" from {public} to {authenticated}
DROP POLICY "Authenticated users can view activity logs" ON public.task_activity_log;
CREATE POLICY "Authenticated users can view activity logs" ON public.task_activity_log
  FOR SELECT TO authenticated
  USING (true);
