
-- Drop 6 orphaned notification functions confirmed to have:
-- No triggers, no RPC calls, no edge function refs, no app code refs, no DB function refs

DROP FUNCTION IF EXISTS public.notify_task_status_changed();
DROP FUNCTION IF EXISTS public.notify_task_status_change();
DROP FUNCTION IF EXISTS public.notify_task_deadline_changed();
DROP FUNCTION IF EXISTS public.notify_task_priority_changed();
DROP FUNCTION IF EXISTS public.notify_task_assignment();
DROP FUNCTION IF EXISTS public.notify_task_field_updates();
