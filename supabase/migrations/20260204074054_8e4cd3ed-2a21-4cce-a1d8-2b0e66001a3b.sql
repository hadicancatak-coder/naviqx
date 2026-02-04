-- =====================================================
-- PHASE 7: DATA MIGRATION TO UNIFIED PUBLIC ACCESS SYSTEM
-- =====================================================

-- 1. Migrate campaign_external_access tokens to public_access_links
INSERT INTO public.public_access_links (
  access_token,
  resource_type,
  resource_id,
  entity,
  reviewer_name,
  reviewer_email,
  email_verified,
  expires_at,
  is_active,
  is_public,
  created_by,
  created_at,
  click_count,
  last_accessed_at,
  metadata
)
SELECT
  access_token,
  'campaign'::external_resource_type,
  campaign_id,
  entity,
  reviewer_name,
  reviewer_email,
  COALESCE(email_verified, false),
  expires_at,
  COALESCE(is_active, true),
  false,
  created_by,
  COALESCE(created_at, now()),
  COALESCE(click_count, 0),
  last_accessed_at,
  jsonb_build_object('migrated_from', 'campaign_external_access', 'migrated_at', now())
FROM public.campaign_external_access
WHERE NOT EXISTS (
  SELECT 1 FROM public.public_access_links 
  WHERE public_access_links.access_token = campaign_external_access.access_token
);

-- 2. Migrate external_campaign_review_comments to public_access_comments
INSERT INTO public.public_access_comments (
  access_link_id,
  resource_type,
  resource_id,
  reviewer_name,
  reviewer_email,
  comment_text,
  comment_type,
  created_at,
  metadata
)
SELECT
  pal.id,
  'campaign'::external_resource_type,
  ecrc.campaign_id,
  ecrc.reviewer_name,
  ecrc.reviewer_email,
  ecrc.comment_text,
  COALESCE(ecrc.comment_type, 'general'),
  COALESCE(ecrc.created_at, now()),
  jsonb_build_object(
    'migrated_from', 'external_campaign_review_comments',
    'migrated_at', now(),
    'original_entity', ecrc.entity,
    'version_id', ecrc.version_id
  )
FROM public.external_campaign_review_comments ecrc
JOIN public.public_access_links pal ON pal.access_token = ecrc.access_token
WHERE NOT EXISTS (
  SELECT 1 FROM public.public_access_comments pac
  WHERE pac.access_link_id = pal.id
    AND pac.comment_text = ecrc.comment_text
    AND pac.reviewer_email = ecrc.reviewer_email
    AND pac.created_at = ecrc.created_at
);

-- 3. Migrate knowledge_pages public tokens
INSERT INTO public.public_access_links (
  access_token,
  resource_type,
  resource_id,
  entity,
  is_active,
  is_public,
  created_at,
  metadata
)
SELECT
  public_token,
  'knowledge'::external_resource_type,
  id,
  NULL,
  is_public,
  true,
  COALESCE(updated_at, now()),
  jsonb_build_object('migrated_from', 'knowledge_pages', 'migrated_at', now(), 'title', title)
FROM public.knowledge_pages
WHERE public_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.public_access_links 
    WHERE public_access_links.access_token = knowledge_pages.public_token
  );

-- 4. Migrate projects public tokens
INSERT INTO public.public_access_links (
  access_token,
  resource_type,
  resource_id,
  entity,
  is_active,
  is_public,
  created_at,
  metadata
)
SELECT
  public_token,
  'project'::external_resource_type,
  id,
  NULL,
  is_public,
  true,
  COALESCE(updated_at, now()),
  jsonb_build_object('migrated_from', 'projects', 'migrated_at', now(), 'name', name)
FROM public.projects
WHERE public_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.public_access_links 
    WHERE public_access_links.access_token = projects.public_token
  );