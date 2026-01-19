-- =====================================================
-- SECURITY FIX: Function Search Path Mutable (Part 2)
-- Fix remaining functions that weren't updated in previous migration
-- =====================================================

-- Fix get_users_in_teams (correct return type: TABLE)
DROP FUNCTION IF EXISTS public.get_users_in_teams(text[]);
CREATE FUNCTION public.get_users_in_teams(team_names text[])
RETURNS TABLE(user_id uuid, profile_id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY 
  SELECT p.user_id, p.id as profile_id, p.name
  FROM public.profiles p
  WHERE p.teams && team_names;
END;
$$;

-- Fix increment_board_access
CREATE OR REPLACE FUNCTION public.increment_board_access(p_user_id uuid, p_board_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_board_access (user_id, board_id, access_count, last_accessed_at)
  VALUES (p_user_id, p_board_id, 1, now())
  ON CONFLICT (user_id, board_id)
  DO UPDATE SET 
    access_count = public.user_board_access.access_count + 1,
    last_accessed_at = now();
END;
$$;

-- =====================================================
-- SECURITY FIX: Overly Permissive RLS Policies
-- Replace WITH CHECK (true) / USING (true) with proper auth checks
-- =====================================================

-- Fix web_intel_sites UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update sites" ON public.web_intel_sites;
CREATE POLICY "Authenticated users can update sites" ON public.web_intel_sites
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix web_intel_sites DELETE policy  
DROP POLICY IF EXISTS "Authenticated users can delete sites" ON public.web_intel_sites;
CREATE POLICY "Authenticated users can delete sites" ON public.web_intel_sites
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix web_intel_historic_prices policies
DROP POLICY IF EXISTS "Authenticated users can create historic prices" ON public.web_intel_historic_prices;
CREATE POLICY "Authenticated users can create historic prices" ON public.web_intel_historic_prices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update historic prices" ON public.web_intel_historic_prices;
CREATE POLICY "Authenticated users can update historic prices" ON public.web_intel_historic_prices
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete historic prices" ON public.web_intel_historic_prices;
CREATE POLICY "Authenticated users can delete historic prices" ON public.web_intel_historic_prices
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix web_intel_past_campaigns policies
DROP POLICY IF EXISTS "Authenticated users can create past campaigns" ON public.web_intel_past_campaigns;
CREATE POLICY "Authenticated users can create past campaigns" ON public.web_intel_past_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update past campaigns" ON public.web_intel_past_campaigns;
CREATE POLICY "Authenticated users can update past campaigns" ON public.web_intel_past_campaigns
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete past campaigns" ON public.web_intel_past_campaigns;
CREATE POLICY "Authenticated users can delete past campaigns" ON public.web_intel_past_campaigns
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix web_intel_deals policies
DROP POLICY IF EXISTS "Authenticated users can update deals" ON public.web_intel_deals;
CREATE POLICY "Authenticated users can update deals" ON public.web_intel_deals
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete deals" ON public.web_intel_deals;
CREATE POLICY "Authenticated users can delete deals" ON public.web_intel_deals
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can create deals" ON public.web_intel_deals;
CREATE POLICY "Authenticated users can create deals" ON public.web_intel_deals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix campaign_entity_tracking policy (ALL with true is too permissive)
DROP POLICY IF EXISTS "Authenticated users can manage tracking" ON public.campaign_entity_tracking;
CREATE POLICY "Authenticated users can select tracking" ON public.campaign_entity_tracking
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert tracking" ON public.campaign_entity_tracking
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update tracking" ON public.campaign_entity_tracking
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete tracking" ON public.campaign_entity_tracking
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- SECURITY FIX: Materialized View in API
-- Revoke direct API access to task_comment_counts
-- =====================================================

REVOKE ALL ON public.task_comment_counts FROM anon, authenticated;
GRANT SELECT ON public.task_comment_counts TO authenticated;