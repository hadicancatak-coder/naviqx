-- Add new columns to projects table for enhanced functionality
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS purpose text,
ADD COLUMN IF NOT EXISTS outcomes text,
ADD COLUMN IF NOT EXISTS icon text DEFAULT 'folder-kanban',
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on-hold', 'completed')),
ADD COLUMN IF NOT EXISTS click_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;

-- Add new columns to project_timelines for better visualization
ALTER TABLE public.project_timelines
ADD COLUMN IF NOT EXISTS color text DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Create index on public_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_public_token ON public.projects(public_token) WHERE public_token IS NOT NULL;

-- Create index on parent_id for tree queries
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON public.projects(parent_id);

-- Add RLS policy for public project access
CREATE POLICY "Public projects accessible by token"
ON public.projects
FOR SELECT
USING (is_public = true AND public_token IS NOT NULL);

-- Add RLS policy for public timeline access (when project is public)
CREATE POLICY "Public project timelines accessible"
ON public.project_timelines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_timelines.project_id 
    AND projects.is_public = true 
    AND projects.public_token IS NOT NULL
  )
);