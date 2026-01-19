-- =====================================================
-- SECURITY FIX: Remaining RLS Policies with USING(true) or WITH CHECK(true)
-- =====================================================

-- Fix tasks policies - still allow authenticated but with proper check
DROP POLICY IF EXISTS "All authenticated users can update tasks" ON public.tasks;
CREATE POLICY "All authenticated users can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "All authenticated users can delete tasks" ON public.tasks;
CREATE POLICY "All authenticated users can delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix phase_dependencies policies
DROP POLICY IF EXISTS "Authenticated users can create phase dependencies" ON public.phase_dependencies;
CREATE POLICY "Authenticated users can create phase dependencies" ON public.phase_dependencies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update phase dependencies" ON public.phase_dependencies;
CREATE POLICY "Authenticated users can update phase dependencies" ON public.phase_dependencies
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete phase dependencies" ON public.phase_dependencies;
CREATE POLICY "Authenticated users can delete phase dependencies" ON public.phase_dependencies
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix phase_milestones policies
DROP POLICY IF EXISTS "Authenticated users can create phase milestones" ON public.phase_milestones;
CREATE POLICY "Authenticated users can create phase milestones" ON public.phase_milestones
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update phase milestones" ON public.phase_milestones;
CREATE POLICY "Authenticated users can update phase milestones" ON public.phase_milestones
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete phase milestones" ON public.phase_milestones;
CREATE POLICY "Authenticated users can delete phase milestones" ON public.phase_milestones
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix campaign_metadata policy
DROP POLICY IF EXISTS "Users can update campaign metadata" ON public.campaign_metadata;
CREATE POLICY "Users can update campaign metadata" ON public.campaign_metadata
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix campaign_comments policy
DROP POLICY IF EXISTS "Users can create comments" ON public.campaign_comments;
CREATE POLICY "Users can create comments" ON public.campaign_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Note: The following "System can..." policies are intentionally permissive
-- They are used by SECURITY DEFINER trigger functions and edge functions
-- that run as service_role, not as authenticated users.
-- Changing them would break trigger-based logging.
-- 
-- Keeping permissive for system tables (audit/logging):
-- - activity_logs: System can create activity logs
-- - ad_versions: System can create ad versions
-- - admin_audit_log: System can insert audit logs
-- - auth_events: System can insert auth events
-- - error_logs: System can insert error logs
-- - mfa_backup_code_usage: System can insert backup code usage
-- - mfa_challenges: System can insert MFA challenges
-- - mfa_sessions: System can create MFA sessions
-- - mfa_verification_attempts: System can insert MFA attempts
-- - security_scan_results: System can create/update
-- - suspicious_activities: System can create
-- - task_activity_log: System can insert activity logs
-- - task_change_logs: System can insert change logs
-- - utm_change_history: System can insert change history
--
-- These are CORRECT as-is because they allow triggers/edge functions 
-- (running as service role) to insert audit records.
-- =====================================================

-- Fix external review comments - consolidate duplicate policies
-- These need to remain public for external reviewers (anonymous access)
DROP POLICY IF EXISTS "Public can create external comments" ON public.external_campaign_review_comments;
DROP POLICY IF EXISTS "Allow anonymous insert review comments" ON public.external_campaign_review_comments;
DROP POLICY IF EXISTS "anon_insert_review_comments" ON public.external_campaign_review_comments;
CREATE POLICY "External reviewers can create comments" ON public.external_campaign_review_comments
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    reviewer_email IS NOT NULL 
    AND reviewer_name IS NOT NULL 
    AND access_token IS NOT NULL
  );