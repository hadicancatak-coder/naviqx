-- Add sort_order column for manual task ordering
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON public.tasks(sort_order);

-- Initialize sort_order based on creation date for existing tasks
UPDATE public.tasks 
SET sort_order = EXTRACT(EPOCH FROM created_at)::integer 
WHERE sort_order = 0 OR sort_order IS NULL;