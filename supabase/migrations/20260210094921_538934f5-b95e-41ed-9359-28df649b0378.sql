
-- Campaign assets table for images, videos, logos
CREATE TABLE public.campaign_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.search_campaigns(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'image_square', 'image_landscape', 'video_landscape', 'video_square', 'video_portrait', 'logo_square', 'logo_wide'
  asset_url TEXT NOT NULL,
  file_name TEXT,
  dimensions TEXT, -- e.g. '1200x1200', '1920x1080'
  aspect_ratio TEXT, -- '1:1', '1.91:1', '4:1', '16:9', '9:16'
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'rejected'
  policy_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  policy_notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can CRUD
CREATE POLICY "Authenticated users can view campaign assets"
  ON public.campaign_assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert campaign assets"
  ON public.campaign_assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaign assets"
  ON public.campaign_assets FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete campaign assets"
  ON public.campaign_assets FOR DELETE
  TO authenticated
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_campaign_assets_campaign ON public.campaign_assets(campaign_id);
CREATE INDEX idx_campaign_assets_ad ON public.campaign_assets(ad_id);
CREATE INDEX idx_campaign_assets_type ON public.campaign_assets(asset_type);

-- Create storage bucket for campaign assets
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-assets', 'campaign-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view campaign assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'campaign-assets');

CREATE POLICY "Authenticated users can upload campaign assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-assets');

CREATE POLICY "Authenticated users can update campaign assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-assets');

CREATE POLICY "Authenticated users can delete campaign assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-assets');
