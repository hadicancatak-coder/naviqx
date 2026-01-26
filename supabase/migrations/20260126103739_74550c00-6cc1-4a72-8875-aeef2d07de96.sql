-- Allow authenticated users to update their own external access records
CREATE POLICY "Authenticated users can update own records"
ON public.campaign_external_access
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to select their own records  
CREATE POLICY "Authenticated users can select own records"
ON public.campaign_external_access
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR is_active = true);

-- Allow authenticated users to delete their own records
CREATE POLICY "Authenticated users can delete own records"
ON public.campaign_external_access
FOR DELETE
TO authenticated
USING (created_by = auth.uid());