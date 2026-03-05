
-- 1. Add deleted_at column
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create soft_delete_task RPC
CREATE OR REPLACE FUNCTION public.soft_delete_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE tasks
  SET deleted_at = NOW(),
      delete_requested_by = auth.uid(),
      delete_requested_at = NOW(),
      updated_at = NOW()
  WHERE id = p_task_id
    AND deleted_at IS NULL;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or already deleted';
  END IF;
END;
$function$;

-- 3. Create admin-only restore_task RPC
CREATE OR REPLACE FUNCTION public.restore_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can restore deleted tasks';
  END IF;

  UPDATE tasks
  SET deleted_at = NULL,
      delete_requested_by = NULL,
      delete_requested_at = NULL,
      updated_at = NOW()
  WHERE id = p_task_id
    AND deleted_at IS NOT NULL;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not deleted';
  END IF;
END;
$function$;

-- 4. Update SELECT RLS policy to hide soft-deleted tasks for non-admins
DROP POLICY "All authenticated users can view all tasks" ON public.tasks;
CREATE POLICY "All authenticated users can view all tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL 
    OR has_role(auth.uid(), 'admin'::app_role)
  );
