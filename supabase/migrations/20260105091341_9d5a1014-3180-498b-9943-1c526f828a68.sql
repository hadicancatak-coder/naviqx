-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "subtasks_inherit_parent_access" ON public.tasks;

-- The existing policies already allow authenticated users full access:
-- "All authenticated users can view all tasks" - SELECT with qual: true
-- "All authenticated users can update tasks" - UPDATE with qual: true  
-- "All authenticated users can delete tasks" - DELETE with qual: true
-- "All authenticated users can create tasks" - INSERT with check on created_by

-- No additional policy needed for subtasks since parent access is already granted to all authenticated users