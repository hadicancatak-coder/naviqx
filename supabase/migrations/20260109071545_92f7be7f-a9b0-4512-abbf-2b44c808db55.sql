-- Add connector label and line style columns
ALTER TABLE public.whiteboard_connectors 
ADD COLUMN label TEXT DEFAULT '',
ADD COLUMN line_style TEXT DEFAULT 'solid';

-- Add whiteboard project association and description
ALTER TABLE public.whiteboards 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN description TEXT DEFAULT '';