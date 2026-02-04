-- Add category field to knowledge_pages for unified Library
-- Categories: service, project, knowledge, rules, process

-- Add category column
ALTER TABLE public.knowledge_pages 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'knowledge';

-- Add project_id column to link with projects
ALTER TABLE public.knowledge_pages 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add constraint for valid categories
ALTER TABLE public.knowledge_pages 
ADD CONSTRAINT knowledge_pages_category_check 
CHECK (category IN ('service', 'project', 'knowledge', 'rules', 'process'));

-- Migrate existing tech_stack_pages data to knowledge_pages as 'service' category
INSERT INTO public.knowledge_pages (title, slug, content, parent_id, icon, order_index, created_by, created_at, updated_at, updated_by, category)
SELECT 
  title, 
  slug, 
  content, 
  NULL as parent_id, -- Reset parent relationships
  icon, 
  order_index + 1000, -- Offset to avoid conflicts
  created_by, 
  created_at, 
  updated_at, 
  updated_by,
  'service' as category
FROM public.tech_stack_pages
ON CONFLICT DO NOTHING;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_category ON public.knowledge_pages(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_project_id ON public.knowledge_pages(project_id);