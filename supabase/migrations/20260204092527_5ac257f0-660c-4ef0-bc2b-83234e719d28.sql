-- Add email_enabled column to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT false;

-- Create helper function to check if email notification is enabled
CREATE OR REPLACE FUNCTION public.is_email_notification_enabled(p_user_id uuid, p_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email_enabled FROM notification_preferences 
     WHERE user_id = p_user_id AND notification_type = p_type),
    false
  );
$$;