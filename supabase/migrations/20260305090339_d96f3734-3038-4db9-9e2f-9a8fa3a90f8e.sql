-- blocker_assignees: 3 policies
DROP POLICY "Blocker assignees viewable by authenticated users" ON public.blocker_assignees;
CREATE POLICY "Blocker assignees viewable by authenticated users" ON public.blocker_assignees FOR SELECT TO authenticated USING (true);

DROP POLICY "Users can assign to blockers" ON public.blocker_assignees;
CREATE POLICY "Users can assign to blockers" ON public.blocker_assignees FOR INSERT TO authenticated WITH CHECK ((auth.uid() = assigned_by) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Users can unassign from blockers" ON public.blocker_assignees;
CREATE POLICY "Users can unassign from blockers" ON public.blocker_assignees FOR DELETE TO authenticated USING ((auth.uid() = assigned_by) OR (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- comment_mentions: 2 policies
DROP POLICY "Mentions viewable by authenticated users" ON public.comment_mentions;
CREATE POLICY "Mentions viewable by authenticated users" ON public.comment_mentions FOR SELECT TO authenticated USING (true);

DROP POLICY "Comment authors can create mentions" ON public.comment_mentions;
CREATE POLICY "Comment authors can create mentions" ON public.comment_mentions FOR INSERT TO authenticated WITH CHECK (is_comment_author(comment_id, auth.uid()));

-- description_mentions: 3 policies
DROP POLICY "Authenticated users can view mentions" ON public.description_mentions;
CREATE POLICY "Authenticated users can view mentions" ON public.description_mentions FOR SELECT TO authenticated USING (true);

DROP POLICY "Authenticated users can create mentions" ON public.description_mentions;
CREATE POLICY "Authenticated users can create mentions" ON public.description_mentions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Users can delete their own mentions" ON public.description_mentions;
CREATE POLICY "Users can delete their own mentions" ON public.description_mentions FOR DELETE TO authenticated USING (auth.uid() = mentioned_by);

-- task_assignees: 3 policies
DROP POLICY "Assignees viewable by authenticated users" ON public.task_assignees;
CREATE POLICY "Assignees viewable by authenticated users" ON public.task_assignees FOR SELECT TO authenticated USING (true);

DROP POLICY "Users can assign to tasks" ON public.task_assignees;
CREATE POLICY "Users can assign to tasks" ON public.task_assignees FOR INSERT TO authenticated WITH CHECK ((assigned_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Users can unassign from tasks" ON public.task_assignees;
CREATE POLICY "Users can unassign from tasks" ON public.task_assignees FOR DELETE TO authenticated USING ((auth.uid() = assigned_by) OR (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- time_entries: 1 policy
DROP POLICY "Users can delete own time entries" ON public.time_entries;
CREATE POLICY "Users can delete own time entries" ON public.time_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_agenda: 4 policies
DROP POLICY "Users can view own agenda" ON public.user_agenda;
CREATE POLICY "Users can view own agenda" ON public.user_agenda FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Admins can view all agendas" ON public.user_agenda;
CREATE POLICY "Admins can view all agendas" ON public.user_agenda FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Users can add to own agenda" ON public.user_agenda;
CREATE POLICY "Users can add to own agenda" ON public.user_agenda FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can remove from own agenda" ON public.user_agenda;
CREATE POLICY "Users can remove from own agenda" ON public.user_agenda FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_task_order: 5 policies
DROP POLICY "Users can view own task order" ON public.user_task_order;
CREATE POLICY "Users can view own task order" ON public.user_task_order FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Admins can view all task orders" ON public.user_task_order;
CREATE POLICY "Admins can view all task orders" ON public.user_task_order FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Users can create own task order" ON public.user_task_order;
CREATE POLICY "Users can create own task order" ON public.user_task_order FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can update own task order" ON public.user_task_order;
CREATE POLICY "Users can update own task order" ON public.user_task_order FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can delete own task order" ON public.user_task_order;
CREATE POLICY "Users can delete own task order" ON public.user_task_order FOR DELETE TO authenticated USING (auth.uid() = user_id);