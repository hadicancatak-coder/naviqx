
ALTER TABLE ads ADD COLUMN IF NOT EXISTS app_platform text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS app_campaign_goal text;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS app_store_url text;
