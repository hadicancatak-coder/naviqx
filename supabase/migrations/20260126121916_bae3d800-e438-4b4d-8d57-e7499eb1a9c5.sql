-- Phase 1: Fix External Feedback Submission RLS Policies

-- Allow anon users to SELECT from campaign_external_access to verify tokens
CREATE POLICY "Anon can verify tokens for comments"
ON public.campaign_external_access
FOR SELECT
TO anon
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Public can comment via valid token" ON public.external_campaign_review_comments;

-- Create new INSERT policy that allows anon and authenticated users with valid tokens
CREATE POLICY "Anyone with valid token can insert comments"
ON public.external_campaign_review_comments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  reviewer_email IS NOT NULL 
  AND reviewer_name IS NOT NULL 
  AND access_token IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM campaign_external_access
    WHERE campaign_external_access.access_token = external_campaign_review_comments.access_token
    AND campaign_external_access.is_active = true
    AND (campaign_external_access.expires_at IS NULL OR campaign_external_access.expires_at > now())
  )
);