-- Add auto_progress flag to project_timelines for automatic progress calculation
ALTER TABLE project_timelines ADD COLUMN IF NOT EXISTS auto_progress BOOLEAN DEFAULT true;