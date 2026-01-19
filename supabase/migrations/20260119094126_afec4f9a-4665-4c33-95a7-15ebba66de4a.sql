-- LP Planner Tables

-- 1. LP Sections - Reusable section templates
CREATE TABLE public.lp_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  brief_content TEXT,
  section_type TEXT NOT NULL DEFAULT 'custom',
  sample_images JSONB DEFAULT '[]'::jsonb,
  website_links JSONB DEFAULT '[]'::jsonb,
  entity_id UUID REFERENCES public.system_entities(id),
  created_by UUID NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. LP Maps - Complete LP compositions
CREATE TABLE public.lp_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  entity_id UUID REFERENCES public.system_entities(id),
  created_by UUID NOT NULL,
  status TEXT DEFAULT 'draft',
  is_active BOOLEAN DEFAULT true,
  public_token UUID DEFAULT gen_random_uuid(),
  is_public BOOLEAN DEFAULT false,
  click_count INT DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. LP Map Sections - Junction table for map-section relationships
CREATE TABLE public.lp_map_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lp_map_id UUID NOT NULL REFERENCES public.lp_maps(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.lp_sections(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  overrides JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. LP External Comments - Comments from external reviewers
CREATE TABLE public.lp_external_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lp_map_id UUID NOT NULL REFERENCES public.lp_maps(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.lp_sections(id),
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  access_token UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lp_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lp_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lp_map_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lp_external_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lp_sections
CREATE POLICY "Authenticated users can view all sections"
  ON public.lp_sections FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create sections"
  ON public.lp_sections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sections"
  ON public.lp_sections FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sections"
  ON public.lp_sections FOR DELETE
  USING (auth.role() = 'authenticated');

-- RLS Policies for lp_maps
CREATE POLICY "Authenticated users can view all maps"
  ON public.lp_maps FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view public maps by token"
  ON public.lp_maps FOR SELECT
  USING (is_public = true);

CREATE POLICY "Authenticated users can create maps"
  ON public.lp_maps FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update maps"
  ON public.lp_maps FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete maps"
  ON public.lp_maps FOR DELETE
  USING (auth.role() = 'authenticated');

-- RLS Policies for lp_map_sections
CREATE POLICY "Authenticated users can view all map sections"
  ON public.lp_map_sections FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view sections of public maps"
  ON public.lp_map_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lp_maps 
      WHERE id = lp_map_id AND is_public = true
    )
  );

CREATE POLICY "Authenticated users can create map sections"
  ON public.lp_map_sections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update map sections"
  ON public.lp_map_sections FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete map sections"
  ON public.lp_map_sections FOR DELETE
  USING (auth.role() = 'authenticated');

-- RLS Policies for lp_external_comments
CREATE POLICY "Anyone can insert comments with valid token"
  ON public.lp_external_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lp_maps 
      WHERE id = lp_map_id AND public_token = access_token AND is_public = true
    )
  );

CREATE POLICY "Authenticated users can view all comments"
  ON public.lp_external_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view comments on public maps"
  ON public.lp_external_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lp_maps 
      WHERE id = lp_map_id AND is_public = true
    )
  );

-- Create indexes for performance
CREATE INDEX idx_lp_sections_entity ON public.lp_sections(entity_id);
CREATE INDEX idx_lp_sections_type ON public.lp_sections(section_type);
CREATE INDEX idx_lp_maps_entity ON public.lp_maps(entity_id);
CREATE INDEX idx_lp_maps_public_token ON public.lp_maps(public_token);
CREATE INDEX idx_lp_map_sections_map ON public.lp_map_sections(lp_map_id);
CREATE INDEX idx_lp_map_sections_position ON public.lp_map_sections(lp_map_id, position);
CREATE INDEX idx_lp_external_comments_map ON public.lp_external_comments(lp_map_id);

-- Create storage bucket for section images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lp-section-images', 'lp-section-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lp-section-images bucket
CREATE POLICY "Public can view lp section images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lp-section-images');

CREATE POLICY "Authenticated users can upload lp section images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lp-section-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update lp section images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lp-section-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete lp section images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lp-section-images' AND auth.role() = 'authenticated');

-- Trigger for updated_at on lp_sections
CREATE TRIGGER update_lp_sections_updated_at
  BEFORE UPDATE ON public.lp_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on lp_maps
CREATE TRIGGER update_lp_maps_updated_at
  BEFORE UPDATE ON public.lp_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();