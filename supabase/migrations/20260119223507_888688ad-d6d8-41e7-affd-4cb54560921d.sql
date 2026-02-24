-- Update the report-photos bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'report-photos';