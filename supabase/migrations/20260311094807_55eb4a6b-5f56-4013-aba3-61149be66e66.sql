
-- Create dev_tickets table
CREATE TABLE public.dev_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  link text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dev_tickets ENABLE ROW LEVEL SECURITY;

-- Select: all authenticated users
CREATE POLICY "Authenticated users can view all tickets"
  ON public.dev_tickets FOR SELECT TO authenticated
  USING (true);

-- Insert: own rows only
CREATE POLICY "Users can create their own tickets"
  ON public.dev_tickets FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Update: all authenticated users
CREATE POLICY "Authenticated users can update tickets"
  ON public.dev_tickets FOR UPDATE TO authenticated
  USING (true);

-- Delete: admin only
CREATE POLICY "Admins can delete tickets"
  ON public.dev_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Reuse existing updated_at trigger
CREATE TRIGGER update_dev_tickets_updated_at
  BEFORE UPDATE ON public.dev_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
