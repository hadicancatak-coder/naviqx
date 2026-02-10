
-- Add campaign_type column
ALTER TABLE search_campaigns
  ADD COLUMN campaign_type text NOT NULL DEFAULT 'search';

-- Fix ads cascade (currently SET NULL, should CASCADE)
ALTER TABLE ads DROP CONSTRAINT ads_ad_group_id_fkey;
ALTER TABLE ads ADD CONSTRAINT ads_ad_group_id_fkey 
  FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE;
