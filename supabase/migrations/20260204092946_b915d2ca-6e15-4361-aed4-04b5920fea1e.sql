-- Enable pg_net extension for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create trigger function for instant email notifications
-- Uses pg_net for async HTTP calls - does NOT block the insert
CREATE OR REPLACE FUNCTION public.trigger_instant_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Only trigger for email-supported notification types
  IF NEW.type NOT IN ('task_assigned', 'mention', 'comment_mention', 'description_mention') THEN
    RETURN NEW;
  END IF;

  -- Get the Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Use pg_net for async HTTP call - this does NOT block the insert
  -- The email function will check preferences before sending
  PERFORM extensions.http_post(
    url := 'https://mwogxqonlzjrkktwbkma.supabase.co/functions/v1/send-notification-email',
    body := jsonb_build_object(
      'type', NEW.type,
      'user_id', NEW.user_id,
      'payload', NEW.payload_json
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the notification insert
    RAISE WARNING 'Email trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger on notifications table
DROP TRIGGER IF EXISTS trigger_send_instant_email ON public.notifications;

CREATE TRIGGER trigger_send_instant_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_instant_email_notification();