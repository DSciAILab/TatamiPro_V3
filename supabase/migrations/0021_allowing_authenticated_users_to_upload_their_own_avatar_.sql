CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );