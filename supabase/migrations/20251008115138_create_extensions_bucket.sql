-- Create public bucket for browser extensions
INSERT INTO storage.buckets (id, name, public)
VALUES ('extensions', 'extensions', true);

-- Allow public read access to the extensions bucket
CREATE POLICY "Public read access for extensions"
ON storage.objects FOR SELECT
USING (bucket_id = 'extensions');

-- Allow authenticated users to upload extensions (optional - remove if only CI/CD should upload)
CREATE POLICY "Authenticated users can upload extensions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'extensions' AND auth.role() = 'authenticated');
