CREATE POLICY "Allow anonymous read via public access links"
ON public.app_store_listings
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.public_access_links pal
    WHERE pal.resource_id = app_store_listings.id
      AND pal.resource_type = 'app_store'
      AND pal.is_active = true
  )
);