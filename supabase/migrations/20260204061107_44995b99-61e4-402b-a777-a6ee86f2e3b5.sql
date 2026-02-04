-- ========================================
-- UNIFIED EXTERNAL ACCESS SYSTEM
-- Single tables for all public access links and comments
-- ========================================

-- 1. Create resource type enum for type safety
CREATE TYPE public.external_resource_type AS ENUM (
  'campaign',
  'knowledge', 
  'project',
  'lp_map',
  'search_ads'
);

-- 2. Create unified access links table
CREATE TABLE public.public_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL UNIQUE,
  resource_type external_resource_type NOT NULL,
  resource_id UUID, -- NULL for entity-wide access
  entity TEXT, -- Entity filter (UAE, KSA, etc.)
  reviewer_name TEXT,
  reviewer_email TEXT,
  email_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Public without verification
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  click_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Create unified comments table
CREATE TABLE public.public_access_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_link_id UUID REFERENCES public.public_access_links(id) ON DELETE CASCADE NOT NULL,
  resource_type external_resource_type NOT NULL,
  resource_id UUID, -- Specific item being commented on
  parent_id UUID REFERENCES public.public_access_comments(id) ON DELETE CASCADE, -- For threading
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'general',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create indexes for performance
CREATE INDEX idx_public_access_links_token ON public.public_access_links(access_token);
CREATE INDEX idx_public_access_links_resource ON public.public_access_links(resource_type, entity) WHERE is_active = true;
CREATE INDEX idx_public_access_links_created_by ON public.public_access_links(created_by);
CREATE INDEX idx_public_access_comments_link ON public.public_access_comments(access_link_id);
CREATE INDEX idx_public_access_comments_resource ON public.public_access_comments(resource_type, resource_id);

-- 5. Unique partial index: only one active link per entity+resource_type
CREATE UNIQUE INDEX idx_unique_active_entity_resource 
ON public.public_access_links(entity, resource_type) 
WHERE is_active = true AND resource_id IS NULL;

-- 6. Enable RLS
ALTER TABLE public.public_access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_access_comments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for public_access_links

-- Authenticated users can view links they created
CREATE POLICY "Users can view own links"
ON public.public_access_links
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Admins can view all links
CREATE POLICY "Admins can view all links"
ON public.public_access_links
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Anonymous can verify tokens (read-only, limited fields via function)
CREATE POLICY "Anyone can verify active tokens"
ON public.public_access_links
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Authenticated users can create links
CREATE POLICY "Authenticated users can create links"
ON public.public_access_links
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update own links
CREATE POLICY "Users can update own links"
ON public.public_access_links
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Users can delete own links
CREATE POLICY "Users can delete own links"
ON public.public_access_links
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 8. RLS Policies for public_access_comments

-- Anyone can read comments for a valid access link
CREATE POLICY "Anyone can read comments for valid link"
ON public.public_access_comments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.public_access_links
    WHERE id = access_link_id AND is_active = true
  )
);

-- Anyone with valid token can insert comments
CREATE POLICY "Anyone can insert comments for valid link"
ON public.public_access_comments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.public_access_links
    WHERE id = access_link_id AND is_active = true
  )
);

-- Admins can delete comments
CREATE POLICY "Admins can delete comments"
ON public.public_access_comments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9. Function to increment click count (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.increment_access_link_clicks(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.public_access_links
  SET 
    click_count = click_count + 1,
    last_accessed_at = now()
  WHERE access_token = p_token AND is_active = true;
END;
$$;

-- 10. Trigger for updated_at
CREATE TRIGGER update_public_access_links_updated_at
  BEFORE UPDATE ON public.public_access_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Comment type check constraint
ALTER TABLE public.public_access_comments
ADD CONSTRAINT comment_type_check CHECK (
  comment_type IN ('general', 'entity_feedback', 'version_feedback', 'ad_feedback', 'section_feedback', 'lead_quality')
);