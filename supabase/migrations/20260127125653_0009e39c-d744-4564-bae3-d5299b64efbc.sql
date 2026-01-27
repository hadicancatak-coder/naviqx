-- Add DELETE policy for external_campaign_review_comments (admins only)
CREATE POLICY "Admins can delete external comments"
  ON public.external_campaign_review_comments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin delete policy for internal version comments
CREATE POLICY "Admins can delete any version comment"
  ON public.utm_campaign_version_comments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));