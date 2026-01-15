-- Phase 1: Update landing_page_templates table for LP Links storage
-- Add entity reference, name, and management columns

-- Add entity_id column referencing system_entities
ALTER TABLE public.landing_page_templates 
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES public.system_entities(id);

-- Add name column for descriptive LP link names
ALTER TABLE public.landing_page_templates 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add is_active column for soft delete/disable
ALTER TABLE public.landing_page_templates 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add display_order for sorting
ALTER TABLE public.landing_page_templates 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add purpose column (AO, Webinar, Seminar)
ALTER TABLE public.landing_page_templates 
ADD COLUMN IF NOT EXISTS purpose TEXT CHECK (purpose IN ('AO', 'Webinar', 'Seminar'));

-- Add lp_type column (static, dynamic)
ALTER TABLE public.landing_page_templates 
ADD COLUMN IF NOT EXISTS lp_type TEXT CHECK (lp_type IN ('static', 'dynamic')) DEFAULT 'static';

-- Create index for faster entity-based queries
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_entity_id 
ON public.landing_page_templates(entity_id);

-- Create index for purpose filtering
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_purpose 
ON public.landing_page_templates(purpose);

-- Create index for active templates
CREATE INDEX IF NOT EXISTS idx_landing_page_templates_active 
ON public.landing_page_templates(is_active) WHERE is_active = true;

-- Add unique constraint for entity + base_url + purpose combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_page_templates_unique_entity_url_purpose 
ON public.landing_page_templates(entity_id, base_url, purpose) WHERE entity_id IS NOT NULL;