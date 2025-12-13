CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );