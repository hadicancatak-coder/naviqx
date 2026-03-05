
-- Fix notify_on_task_status_change: was inserting profiles.id instead of auth user_id
CREATE OR REPLACE FUNCTION public.notify_on_task_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assignee_record RECORD;
  assignee_auth_id UUID;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get all assignees except the person who made the change
    FOR assignee_record IN 
      SELECT ta.user_id AS profile_id
      FROM task_assignees ta
      WHERE ta.task_id = NEW.id
    LOOP
      -- Resolve auth user_id from profiles.id
      SELECT user_id INTO assignee_auth_id FROM profiles WHERE id = assignee_record.profile_id;
      
      -- Only notify if we found the user and they're not the one who made the change
      IF assignee_auth_id IS NOT NULL AND assignee_auth_id IS DISTINCT FROM auth.uid() THEN
        IF is_notification_enabled(assignee_auth_id, 'task_status_changed') THEN
          BEGIN
            INSERT INTO notifications (user_id, type, payload_json)
            VALUES (
              assignee_auth_id,
              'task_status_changed',
              jsonb_build_object(
                'task_id', NEW.id,
                'task_title', NEW.title,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'changed_by', auth.uid()
              )
            );
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Status change notification failed: %', SQLERRM;
          END;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop the broken 6-arg send_notification overload that references non-existent columns
DROP FUNCTION IF EXISTS public.send_notification(uuid, text, text, text, text, jsonb);
