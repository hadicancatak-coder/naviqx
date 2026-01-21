-- Add new fields for Steps-First roadmap model
-- Steps have: owner, expected outcomes, lane category, and status

-- Add owner field (who/which team owns this step)
ALTER TABLE project_timelines ADD COLUMN IF NOT EXISTS owner TEXT;

-- Add expected_outcomes as an array of text (bullet points)
ALTER TABLE project_timelines ADD COLUMN IF NOT EXISTS expected_outcomes TEXT[] DEFAULT '{}';

-- Add step_lane for categorizing steps into lanes
-- Lanes: discovery, infrastructure, tracking, validation, activation
ALTER TABLE project_timelines ADD COLUMN IF NOT EXISTS step_lane TEXT DEFAULT 'execution';

-- Add step status (not_started, in_progress, blocked, completed)
ALTER TABLE project_timelines ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_started';

-- Add system field (what system/tool this step uses)
ALTER TABLE project_timelines ADD COLUMN IF NOT EXISTS system_name TEXT;

-- Create an index for efficient lane-based queries
CREATE INDEX IF NOT EXISTS idx_project_timelines_step_lane ON project_timelines(step_lane);
CREATE INDEX IF NOT EXISTS idx_project_timelines_status ON project_timelines(status);