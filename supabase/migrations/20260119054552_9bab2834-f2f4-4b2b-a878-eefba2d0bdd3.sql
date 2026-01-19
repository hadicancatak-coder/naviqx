-- Add phase_type column to project_timelines
ALTER TABLE public.project_timelines 
ADD COLUMN IF NOT EXISTS phase_type TEXT DEFAULT 'development';

-- Create phase_milestones table
CREATE TABLE public.phase_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.project_timelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create phase_dependencies table
CREATE TABLE public.phase_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.project_timelines(id) ON DELETE CASCADE,
  depends_on_phase_id UUID NOT NULL REFERENCES public.project_timelines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phase_id, depends_on_phase_id)
);

-- Add phase_id to tasks table for linking tasks to phases
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES public.project_timelines(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.phase_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS policies for phase_milestones (authenticated users can CRUD)
CREATE POLICY "Authenticated users can view phase milestones"
ON public.phase_milestones FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create phase milestones"
ON public.phase_milestones FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update phase milestones"
ON public.phase_milestones FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete phase milestones"
ON public.phase_milestones FOR DELETE
TO authenticated
USING (true);

-- RLS policies for phase_dependencies (authenticated users can CRUD)
CREATE POLICY "Authenticated users can view phase dependencies"
ON public.phase_dependencies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create phase dependencies"
ON public.phase_dependencies FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update phase dependencies"
ON public.phase_dependencies FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete phase dependencies"
ON public.phase_dependencies FOR DELETE
TO authenticated
USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_phase_milestones_phase_id ON public.phase_milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_dependencies_phase_id ON public.phase_dependencies(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_dependencies_depends_on ON public.phase_dependencies(depends_on_phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON public.tasks(phase_id);