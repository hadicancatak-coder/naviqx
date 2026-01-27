-- Add attachment support to comments
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for comment attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-attachments', 'comment-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for uploads
CREATE POLICY "Authenticated users can upload comment attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comment-attachments');

-- RLS policy for reading
CREATE POLICY "Anyone can view comment attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comment-attachments');

-- RLS policy for deleting own files
CREATE POLICY "Users can delete their own comment attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comment-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);