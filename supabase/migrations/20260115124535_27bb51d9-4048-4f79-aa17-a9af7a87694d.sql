-- Fix ads table RLS policies
DROP POLICY IF EXISTS "Authenticated users can delete ads" ON ads;
DROP POLICY IF EXISTS "Authenticated users can update ads" ON ads;

-- Create proper owner-only DELETE policy for ads
CREATE POLICY "Users can delete own ads" ON ads
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Fix ad_groups table RLS policies
DROP POLICY IF EXISTS "Users can create ad groups" ON ad_groups;

-- Create proper INSERT policy for ad_groups
CREATE POLICY "Users can create own ad groups" ON ad_groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Add missing DELETE policy for ad_groups
CREATE POLICY "Users can delete own ad groups" ON ad_groups
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Add performance indexes for ad_elements
CREATE INDEX IF NOT EXISTS idx_ad_elements_element_type ON ad_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_ad_elements_language ON ad_elements(language);
CREATE INDEX IF NOT EXISTS idx_ad_elements_google_status ON ad_elements(google_status);
CREATE INDEX IF NOT EXISTS idx_ad_elements_created_at ON ad_elements(created_at DESC);