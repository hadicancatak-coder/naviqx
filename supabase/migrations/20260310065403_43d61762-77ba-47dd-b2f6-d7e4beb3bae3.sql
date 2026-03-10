-- Update notify_task_assigned to skip auto-generated recurring instances
-- These create noisy notifications with no assigned_by context
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip notifications for recurring task instances (auto-generated, no assigned_by)
  -- These would spam users with empty "Assigned:" notifications every day
  IF EXISTS (
    SELECT 1 FROM tasks WHERE id = NEW.task_id AND template_task_id IS NOT NULL
  ) AND NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Send notification to the newly assigned user
  PERFORM send_notification(
    NEW.user_id,
    'task_assigned',
    jsonb_build_object(
      'task_id', NEW.task_id,
      'task_title', (SELECT title FROM tasks WHERE id = NEW.task_id),
      'assigned_by', NEW.assigned_by
    )
  );
  RETURN NEW;
END;
$$;