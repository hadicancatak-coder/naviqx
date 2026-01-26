-- Add new columns to utm_campaigns for enhanced CSV import
ALTER TABLE utm_campaigns
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Paused', 'Completed', 'Archived')),
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS entity text,
  ADD COLUMN IF NOT EXISTS launch_date date,
  ADD COLUMN IF NOT EXISTS campaign_link text,
  ADD COLUMN IF NOT EXISTS hubspot_utm_campaign text;

-- Create index for entity filtering
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_entity ON utm_campaigns(entity);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_status ON utm_campaigns(status);