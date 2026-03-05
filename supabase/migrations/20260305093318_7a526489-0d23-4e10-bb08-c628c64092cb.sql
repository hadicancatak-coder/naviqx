
-- 1. Update log_task_changes() to remove assignee_id reference
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  changer_id UUID;
BEGIN
  changer_id := COALESCE(auth.uid(), NEW.created_by);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_change_logs (task_id, changed_by, field_name, old_value, new_value, change_type, description)
    VALUES (NEW.id, changer_id, 'task', NULL, to_jsonb(NEW), 'created', 'Task created');
    RETURN NEW;
  END IF;
  
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.task_change_logs (task_id, changed_by, field_name, old_value, new_value, change_type, description)
    VALUES (NEW.id, changer_id, 'status', to_jsonb(OLD.status), to_jsonb(NEW.status), 'status_changed', 
            'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.task_change_logs (task_id, changed_by, field_name, old_value, new_value, change_type, description)
    VALUES (NEW.id, changer_id, 'priority', to_jsonb(OLD.priority), to_jsonb(NEW.priority), 'priority_changed',
            'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
  END IF;
  
  IF NEW.due_at IS DISTINCT FROM OLD.due_at THEN
    INSERT INTO public.task_change_logs (task_id, changed_by, field_name, old_value, new_value, change_type, description)
    VALUES (NEW.id, changer_id, 'due_date', to_jsonb(OLD.due_at), to_jsonb(NEW.due_at), 'due_date_changed',
            CASE WHEN NEW.due_at IS NULL THEN 'Due date removed'
                 WHEN OLD.due_at IS NULL THEN 'Due date added'
                 ELSE 'Due date changed' END);
  END IF;
  
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO public.task_change_logs (task_id, changed_by, field_name, old_value, new_value, change_type, description)
    VALUES (NEW.id, changer_id, 'title', to_jsonb(OLD.title), to_jsonb(NEW.title), 'title_changed', 'Title updated');
  END IF;
  
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO public.task_change_logs (task_id, changed_by, field_name, old_value, new_value, change_type, description)
    VALUES (NEW.id, changer_id, 'description', NULL, NULL, 'description_changed', 'Description updated');
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Drop the index on assignee_id
DROP INDEX IF EXISTS public.idx_tasks_assignee_id;

-- 3. Drop the dead columns
ALTER TABLE public.tasks DROP COLUMN IF EXISTS assignee_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS recurrence_days_of_week;
