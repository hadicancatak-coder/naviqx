-- 1. Add unique constraint for campaign-entity tracking to enable proper upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_entity_tracking_unique 
ON campaign_entity_tracking(campaign_id, entity);

-- 2. Add batch task status update function for performance
CREATE OR REPLACE FUNCTION batch_update_task_status(
  p_task_ids uuid[],
  p_status text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE tasks 
  SET status = p_status, updated_at = now()
  WHERE id = ANY(p_task_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;