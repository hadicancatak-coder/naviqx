-- Create connectors table for arrows between items
CREATE TABLE public.whiteboard_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  from_item_id UUID NOT NULL REFERENCES public.whiteboard_items(id) ON DELETE CASCADE,
  to_item_id UUID NOT NULL REFERENCES public.whiteboard_items(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#64748b',
  stroke_width INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whiteboard_connectors ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage connectors on their whiteboards
CREATE POLICY "Users can view connectors on their whiteboards"
  ON public.whiteboard_connectors FOR SELECT
  USING (
    whiteboard_id IN (
      SELECT id FROM public.whiteboards WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create connectors on their whiteboards"
  ON public.whiteboard_connectors FOR INSERT
  WITH CHECK (
    whiteboard_id IN (
      SELECT id FROM public.whiteboards WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete connectors on their whiteboards"
  ON public.whiteboard_connectors FOR DELETE
  USING (
    whiteboard_id IN (
      SELECT id FROM public.whiteboards WHERE created_by = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX idx_whiteboard_connectors_whiteboard ON public.whiteboard_connectors(whiteboard_id);