-- Create sprints table for sprint management
CREATE TABLE public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning', -- planning, active, completed
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sprints
CREATE POLICY "Sprints viewable by authenticated users"
ON public.sprints FOR SELECT
USING (true);

CREATE POLICY "Admins can create sprints"
ON public.sprints FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sprints"
ON public.sprints FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sprints"
ON public.sprints FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_sprints_updated_at
BEFORE UPDATE ON public.sprints
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to propagate blocked status to dependent tasks
CREATE OR REPLACE FUNCTION propagate_blocked_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a task becomes Blocked, propagate to dependent tasks
  IF NEW.status = 'Blocked' AND (OLD.status IS NULL OR OLD.status != 'Blocked') THEN
    UPDATE tasks 
    SET status = 'Blocked', 
        blocker_reason = 'Auto-blocked: dependency "' || NEW.title || '" is blocked',
        updated_at = now()
    WHERE id IN (
      SELECT task_id FROM task_dependencies WHERE depends_on_task_id = NEW.id
    )
    AND status NOT IN ('Completed', 'Blocked');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to tasks table
CREATE TRIGGER propagate_blocked_status_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION propagate_blocked_status();

-- Enable realtime for sprints
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprints;