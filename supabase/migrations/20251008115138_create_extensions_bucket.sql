-- Create public bucket for browser extensions (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('extensions', 'extensions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for extensions" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload extensions" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update extensions" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete extensions" ON storage.objects;

-- Allow public read access to the extensions bucket
CREATE POLICY "Public read access for extensions"
ON storage.objects FOR SELECT
USING (bucket_id = 'extensions');

-- Allow service role to upload extensions (for CI/CD)
CREATE POLICY "Service role can upload extensions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'extensions' AND (select auth.role()) = 'service_role');

-- Allow service role to update/delete extensions
CREATE POLICY "Service role can update extensions"
ON storage.objects FOR UPDATE
USING (bucket_id = 'extensions' AND (select auth.role()) = 'service_role');

CREATE POLICY "Service role can delete extensions"
ON storage.objects FOR DELETE
USING (bucket_id = 'extensions' AND (select auth.role()) = 'service_role');
