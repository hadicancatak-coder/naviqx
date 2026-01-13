-- Add recurrence template and instance tracking columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurrence_template BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_type TEXT CHECK (recurrence_end_type IN ('never', 'after_n', 'until_date'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_value TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS occurrence_date DATE;

-- Index for background job queries - find templates due for generation
CREATE INDEX IF NOT EXISTS idx_tasks_next_run_at ON tasks(next_run_at) 
WHERE is_recurrence_template = true AND next_run_at IS NOT NULL;

-- Index for finding instances of a template
CREATE INDEX IF NOT EXISTS idx_tasks_template_id ON tasks(template_task_id);

-- Index for checking if instance already exists for a date
CREATE INDEX IF NOT EXISTS idx_tasks_template_date ON tasks(template_task_id, occurrence_date);

-- Add comment for documentation
COMMENT ON COLUMN tasks.is_recurrence_template IS 'True if this task is a recurrence template (not shown in main list)';
COMMENT ON COLUMN tasks.template_task_id IS 'References the template task this instance was created from';
COMMENT ON COLUMN tasks.next_run_at IS 'Next scheduled time for template to generate an instance';
COMMENT ON COLUMN tasks.recurrence_end_type IS 'How recurrence ends: never, after_n occurrences, or until_date';
COMMENT ON COLUMN tasks.recurrence_end_value IS 'Value for end condition: occurrence count or ISO date string';
COMMENT ON COLUMN tasks.occurrence_count IS 'Number of instances generated from this template';
COMMENT ON COLUMN tasks.occurrence_date IS 'The specific date this instance is scheduled for';