
CREATE OR REPLACE FUNCTION public.set_task_assignees(p_task_id uuid, p_assignee_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete existing assignees
  DELETE FROM task_assignees WHERE task_id = p_task_id;

  -- Insert new assignees (if any)
  IF array_length(p_assignee_ids, 1) IS NOT NULL THEN
    INSERT INTO task_assignees (task_id, user_id)
    SELECT p_task_id, unnest(p_assignee_ids);
  END IF;

  -- Update task timestamp
  UPDATE tasks SET updated_at = now() WHERE id = p_task_id;
END;
$$;
