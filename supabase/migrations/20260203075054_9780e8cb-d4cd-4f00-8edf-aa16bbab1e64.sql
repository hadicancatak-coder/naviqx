-- Add unique index on campaign name for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_utm_campaigns_name_unique 
ON utm_campaigns(name) WHERE is_active = true;

-- Create bulk import campaigns RPC function
CREATE OR REPLACE FUNCTION bulk_import_campaigns(
  p_campaigns JSONB[]
) RETURNS TABLE (
  campaign_id UUID,
  action TEXT,
  entity TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  campaign JSONB;
  v_campaign_id UUID;
  v_action TEXT;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  FOREACH campaign IN ARRAY p_campaigns LOOP
    -- Upsert campaign
    INSERT INTO utm_campaigns (name, landing_page, campaign_type, description, created_by, is_active)
    VALUES (
      campaign->>'name',
      campaign->>'landing_page',
      COALESCE(campaign->>'campaign_type', 'Branding'),
      campaign->>'description',
      v_user_id,
      true
    )
    ON CONFLICT (name) WHERE is_active = true DO UPDATE SET
      landing_page = COALESCE(EXCLUDED.landing_page, utm_campaigns.landing_page),
      campaign_type = COALESCE(EXCLUDED.campaign_type, utm_campaigns.campaign_type),
      description = COALESCE(EXCLUDED.description, utm_campaigns.description),
      updated_at = now()
    RETURNING id, CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END 
    INTO v_campaign_id, v_action;
    
    -- Create entity tracking if entity provided
    IF campaign->>'entity' IS NOT NULL AND campaign->>'entity' != '' THEN
      INSERT INTO campaign_entity_tracking (campaign_id, entity, status, created_by)
      VALUES (
        v_campaign_id, 
        campaign->>'entity', 
        COALESCE(campaign->>'status', 'Draft'),
        v_user_id
      )
      ON CONFLICT (campaign_id, entity) DO UPDATE SET
        status = COALESCE(EXCLUDED.status, campaign_entity_tracking.status),
        updated_at = now();
    END IF;
    
    -- Create version if version_notes or asset_link provided
    IF (campaign->>'version_notes' IS NOT NULL AND campaign->>'version_notes' != '') 
       OR (campaign->>'asset_link' IS NOT NULL AND campaign->>'asset_link' != '') THEN
      INSERT INTO utm_campaign_versions (utm_campaign_id, version_number, version_notes, asset_link, created_by)
      VALUES (
        v_campaign_id,
        COALESCE((campaign->>'version_number')::int, 1),
        campaign->>'version_notes',
        campaign->>'asset_link',
        v_user_id
      );
    END IF;
    
    RETURN QUERY SELECT v_campaign_id, v_action, campaign->>'entity';
  END LOOP;
END;
$$;