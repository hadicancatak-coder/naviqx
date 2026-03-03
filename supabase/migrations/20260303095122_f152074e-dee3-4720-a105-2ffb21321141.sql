
-- Create translations table for app store listings
CREATE TABLE public.app_store_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'ar',
  status TEXT NOT NULL DEFAULT 'draft',
  app_name TEXT,
  subtitle TEXT,
  short_description TEXT,
  promotional_text TEXT,
  description TEXT,
  keywords TEXT,
  whats_new TEXT,
  translated_by TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, locale)
);

-- Enable RLS
ALTER TABLE public.app_store_translations ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can CRUD
CREATE POLICY "Authenticated users can read translations"
  ON public.app_store_translations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert translations"
  ON public.app_store_translations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update translations"
  ON public.app_store_translations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete translations"
  ON public.app_store_translations FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_app_store_translations_updated_at
  BEFORE UPDATE ON public.app_store_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
