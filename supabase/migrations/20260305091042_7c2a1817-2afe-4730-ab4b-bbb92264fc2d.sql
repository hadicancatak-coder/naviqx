
CREATE OR REPLACE FUNCTION public.propagate_blocked_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Recursion guard: only allow first-level propagation
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

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
$function$;
