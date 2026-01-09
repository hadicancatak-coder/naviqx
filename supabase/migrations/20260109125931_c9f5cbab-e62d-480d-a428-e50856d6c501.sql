-- Add indexes for common dashboard query patterns
-- These indexes will dramatically speed up task filtering and counting

-- Index for filtering tasks by status
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Index for filtering tasks by due date
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);

-- Composite index for status + due_at (most common filter combo)
CREATE INDEX IF NOT EXISTS idx_tasks_status_due_at ON public.tasks(status, due_at);

-- Index for task_assignees lookups by user_id
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);

-- Index for user_visits by user_id and visited_at (for engagement queries)
CREATE INDEX IF NOT EXISTS idx_user_visits_user_id_visited_at ON public.user_visits(user_id, visited_at);

-- Index for activity_logs by created_at (for recent activity queries)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Index for profiles user_id lookup (frequently used)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);