
ALTER TABLE public.app_store_listings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text;

ALTER TABLE public.app_store_listings
  ADD CONSTRAINT app_store_listings_status_check 
  CHECK (status IN ('draft', 'ready_for_review', 'approved', 'needs_changes', 'live'));
