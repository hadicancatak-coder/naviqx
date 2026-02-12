
-- Create asset_intelligence table
CREATE TABLE public.asset_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity TEXT NOT NULL,
  asset_text TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  google_asset_id TEXT,
  policy_status TEXT NOT NULL DEFAULT 'approved',
  review_status TEXT DEFAULT 'reviewed',
  level TEXT,
  total_interactions INTEGER DEFAULT 0,
  interaction_rate DECIMAL DEFAULT 0,
  total_conversions DECIMAL DEFAULT 0,
  appearance_count INTEGER DEFAULT 1,
  approved_count INTEGER DEFAULT 0,
  disapproved_count INTEGER DEFAULT 0,
  best_interaction_rate DECIMAL DEFAULT 0,
  added_by TEXT DEFAULT 'Advertiser',
  language TEXT DEFAULT 'EN',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for deduplication
CREATE UNIQUE INDEX idx_asset_intel_unique ON public.asset_intelligence (entity, asset_text, asset_type);

-- Performance indexes
CREATE INDEX idx_asset_intel_entity ON public.asset_intelligence (entity);
CREATE INDEX idx_asset_intel_type ON public.asset_intelligence (asset_type);
CREATE INDEX idx_asset_intel_policy ON public.asset_intelligence (policy_status);
CREATE INDEX idx_asset_intel_interaction ON public.asset_intelligence (interaction_rate DESC);

-- Enable RLS
ALTER TABLE public.asset_intelligence ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read asset intelligence"
ON public.asset_intelligence FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert asset intelligence"
ON public.asset_intelligence FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update asset intelligence"
ON public.asset_intelligence FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete asset intelligence"
ON public.asset_intelligence FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_asset_intelligence_updated_at
BEFORE UPDATE ON public.asset_intelligence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
