CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );