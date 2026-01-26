-- Drop the restrictive UPDATE policy and create a more permissive one
-- that allows updating records with NULL created_by (legacy records)
DROP POLICY IF EXISTS "Authenticated users can update own records" ON public.campaign_external_access;

-- Allow authenticated users to update records they created OR records with NULL created_by
CREATE POLICY "Authenticated users can update own or legacy records"
ON public.campaign_external_access
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR created_by IS NULL)
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

-- Also add an INSERT policy for authenticated users (in case it's missing or wrong)
DROP POLICY IF EXISTS "Users can create external access" ON public.campaign_external_access;

CREATE POLICY "Authenticated users can insert external access"
ON public.campaign_external_access
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());