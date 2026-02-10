
-- Add type-aware fields to ad_groups
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS app_platform text;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS app_subtype text;
ALTER TABLE ad_groups ADD COLUMN IF NOT EXISTS targeting_method text;

-- Add utm_campaign link to ads
ALTER TABLE ads ADD COLUMN IF NOT EXISTS utm_campaign_id uuid REFERENCES utm_campaigns(id);
