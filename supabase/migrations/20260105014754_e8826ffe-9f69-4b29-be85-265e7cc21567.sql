-- Make report-photos bucket private and add RLS policies
-- that match the signalements table access rules

-- Update the bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'report-photos';

-- Drop any existing policies on report-photos objects
DROP POLICY IF EXISTS "Report photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload report photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view report photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all report photos" ON storage.objects;

-- Create a function to check if user owns the signalement for a photo
CREATE OR REPLACE FUNCTION public.user_owns_report_photo(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.signalements s
    WHERE s.photo_url LIKE '%' || object_name || '%'
      AND s.user_id = auth.uid()
  )
$$;

-- Users can view photos only if they own the signalement or are admin
CREATE POLICY "Report photos: owner or admin can view"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (
    public.user_owns_report_photo(name)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Users can upload photos to report-photos bucket (will be linked to their signalement)
CREATE POLICY "Report photos: authenticated users can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-photos'
);

-- Users can update their own photos, admins can update any
CREATE POLICY "Report photos: owner or admin can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (
    public.user_owns_report_photo(name)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Users can delete their own photos, admins can delete any
CREATE POLICY "Report photos: owner or admin can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (
    public.user_owns_report_photo(name)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);