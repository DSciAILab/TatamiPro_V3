CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );