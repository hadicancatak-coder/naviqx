-- Allow comment authors to delete their own campaign comments
CREATE POLICY "Users can delete their own campaign comments"
  ON public.utm_campaign_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);