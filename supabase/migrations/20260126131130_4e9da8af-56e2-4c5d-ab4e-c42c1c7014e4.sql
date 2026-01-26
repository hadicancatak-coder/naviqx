-- Update the comment_type check constraint to include 'entity_feedback'
ALTER TABLE public.external_campaign_review_comments 
DROP CONSTRAINT external_campaign_review_comments_comment_type_check;

ALTER TABLE public.external_campaign_review_comments 
ADD CONSTRAINT external_campaign_review_comments_comment_type_check 
CHECK (comment_type = ANY (ARRAY['general'::text, 'lead_quality'::text, 'version_feedback'::text, 'entity_feedback'::text]));