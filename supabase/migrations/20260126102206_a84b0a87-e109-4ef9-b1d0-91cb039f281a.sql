-- Add public sharing columns to utm_campaigns (matching Projects/LP Maps pattern)
ALTER TABLE public.utm_campaigns
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;

-- Create index on public_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_public_token 
ON public.utm_campaigns(public_token) 
WHERE public_token IS NOT NULL;

-- Add RLS policy for public campaign access (anonymous users can view public campaigns)
CREATE POLICY "Public campaigns accessible by token"
ON public.utm_campaigns
FOR SELECT
USING (is_public = true AND public_token IS NOT NULL);