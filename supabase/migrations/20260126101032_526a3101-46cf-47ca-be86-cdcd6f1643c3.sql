-- Make campaign_id nullable to support entity-level feedback
ALTER TABLE external_campaign_review_comments 
ALTER COLUMN campaign_id DROP NOT NULL;