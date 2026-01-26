-- Add unique partial index to prevent duplicate active entity-wide tokens
-- This ensures only ONE active token can exist per entity (where campaign_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_entity_token 
ON public.campaign_external_access (entity) 
WHERE campaign_id IS NULL AND is_active = true;