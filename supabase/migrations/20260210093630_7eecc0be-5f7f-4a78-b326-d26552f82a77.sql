
-- App campaign settings
ALTER TABLE search_campaigns ADD COLUMN app_platform text;
ALTER TABLE search_campaigns ADD COLUMN app_store_id text;
ALTER TABLE search_campaigns ADD COLUMN app_store_url text;
ALTER TABLE search_campaigns ADD COLUMN app_objective text;
ALTER TABLE search_campaigns ADD COLUMN optimization_goal text;
ALTER TABLE search_campaigns ADD COLUMN optimization_event text;
ALTER TABLE search_campaigns ADD COLUMN bidding_type text;
ALTER TABLE search_campaigns ADD COLUMN bidding_target numeric;
ALTER TABLE search_campaigns ADD COLUMN audience_mode text;

-- Display campaign settings
ALTER TABLE search_campaigns ADD COLUMN display_objective text;

-- Shared readiness tracking
ALTER TABLE search_campaigns ADD COLUMN readiness_status text DEFAULT 'not_ready';
