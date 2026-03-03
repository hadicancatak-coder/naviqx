-- Add anon SELECT policy on app_store_translations for external access
CREATE POLICY "Allow anonymous read translations via public access links"
ON public.app_store_translations
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.public_access_links pal
    WHERE pal.resource_id = app_store_translations.listing_id
      AND pal.resource_type = 'app_store'
      AND pal.is_active = true
  )
);

-- Add anon SELECT policy on app_settings for domain validation
CREATE POLICY "Allow anonymous read app_settings"
ON public.app_settings
FOR SELECT
TO anon
USING (key = 'allowed_domains');