-- Add display_order column to utm_platforms table
ALTER TABLE public.utm_platforms 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Update existing platforms with sequential display_order based on name
WITH ordered_platforms AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1 as new_order
  FROM public.utm_platforms
)
UPDATE public.utm_platforms p
SET display_order = op.new_order
FROM ordered_platforms op
WHERE p.id = op.id;