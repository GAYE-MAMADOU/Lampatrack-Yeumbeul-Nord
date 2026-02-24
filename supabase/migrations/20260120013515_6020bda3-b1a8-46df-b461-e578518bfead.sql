-- Allow admins to read all files in report-photos bucket
CREATE POLICY "Admins can view all report photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'report-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow users to view their own uploaded photos
CREATE POLICY "Users can view their own report photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'report-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);