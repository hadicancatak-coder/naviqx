-- Add RLS policy for anonymous users to view sections of public maps
CREATE POLICY "Public can view sections of public maps"
  ON public.lp_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lp_map_sections lms
      JOIN lp_maps lm ON lm.id = lms.lp_map_id
      WHERE lms.section_id = lp_sections.id
        AND lm.is_public = true
    )
  );

-- Add RLS policy for anonymous users to update click tracking on public maps
CREATE POLICY "Public can update click tracking on public maps"
  ON public.lp_maps FOR UPDATE
  USING (is_public = true)
  WITH CHECK (is_public = true);