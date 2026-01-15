-- Fix RLS policy: Allow all authenticated users to view LP templates
DROP POLICY IF EXISTS "Users can view own LP templates" ON public.landing_page_templates;

CREATE POLICY "LP templates viewable by authenticated users"
  ON public.landing_page_templates
  FOR SELECT
  TO authenticated
  USING (true);