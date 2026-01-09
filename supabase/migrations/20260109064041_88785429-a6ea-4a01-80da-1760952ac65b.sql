-- Create whiteboards table
CREATE TABLE public.whiteboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Untitled Whiteboard',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create whiteboard_items table
CREATE TABLE public.whiteboard_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sticky', 'text', 'task')),
  x INTEGER NOT NULL DEFAULT 100,
  y INTEGER NOT NULL DEFAULT 100,
  width INTEGER NOT NULL DEFAULT 200,
  height INTEGER NOT NULL DEFAULT 150,
  color TEXT DEFAULT '#fef08a',
  content TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboard_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for whiteboards
CREATE POLICY "Users can view their own whiteboards"
ON public.whiteboards FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own whiteboards"
ON public.whiteboards FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own whiteboards"
ON public.whiteboards FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own whiteboards"
ON public.whiteboards FOR DELETE
USING (auth.uid() = created_by);

-- RLS policies for whiteboard_items
CREATE POLICY "Users can view items on their whiteboards"
ON public.whiteboard_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whiteboards
    WHERE id = whiteboard_items.whiteboard_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can create items on their whiteboards"
ON public.whiteboard_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whiteboards
    WHERE id = whiteboard_items.whiteboard_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can update items on their whiteboards"
ON public.whiteboard_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.whiteboards
    WHERE id = whiteboard_items.whiteboard_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete items on their whiteboards"
ON public.whiteboard_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.whiteboards
    WHERE id = whiteboard_items.whiteboard_id
    AND created_by = auth.uid()
  )
);

-- Create updated_at trigger for whiteboards
CREATE TRIGGER update_whiteboards_updated_at
BEFORE UPDATE ON public.whiteboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for whiteboard_items
CREATE TRIGGER update_whiteboard_items_updated_at
BEFORE UPDATE ON public.whiteboard_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_whiteboards_created_by ON public.whiteboards(created_by);
CREATE INDEX idx_whiteboard_items_whiteboard_id ON public.whiteboard_items(whiteboard_id);