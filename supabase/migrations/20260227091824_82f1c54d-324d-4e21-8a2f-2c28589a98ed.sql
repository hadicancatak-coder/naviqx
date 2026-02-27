
-- Create app_store_listings table
CREATE TABLE public.app_store_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  store_type TEXT NOT NULL DEFAULT 'apple',
  locale TEXT NOT NULL DEFAULT 'en',
  app_name TEXT,
  subtitle TEXT,
  short_description TEXT,
  promotional_text TEXT,
  description TEXT,
  keywords TEXT,
  whats_new TEXT,
  primary_category TEXT,
  secondary_category TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  screenshot_notes JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_store_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can CRUD
CREATE POLICY "Authenticated users can read all listings"
  ON public.app_store_listings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert listings"
  ON public.app_store_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update listings"
  ON public.app_store_listings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete own listings"
  ON public.app_store_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Auto-update updated_at
CREATE TRIGGER update_app_store_listings_updated_at
  BEFORE UPDATE ON public.app_store_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
