ALTER TABLE ad_groups 
  ADD COLUMN bidding_strategy text,
  DROP COLUMN max_cpc;