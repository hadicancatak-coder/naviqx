-- Create app_settings table for global application configuration
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings (full CRUD)
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read settings (needed for email validation on signup)
CREATE POLICY "Authenticated users can read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- Anon users can read settings (needed for signup validation)
CREATE POLICY "Anon users can read settings" ON public.app_settings
  FOR SELECT TO anon USING (true);

-- Insert default allowed domains
INSERT INTO public.app_settings (key, value, description)
VALUES ('allowed_email_domains', '["cfi.trade"]', 'List of allowed email domains for signup');

-- Refresh the materialized view to ensure comment icons show correctly
REFRESH MATERIALIZED VIEW CONCURRENTLY task_comment_counts;