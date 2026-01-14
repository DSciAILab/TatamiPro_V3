"use client";

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file to a specified Supabase Storage bucket.
 *
 * @param file The file to upload.
 * @param bucket The name of the storage bucket (e.g., 'athlete-photos').
 * @param path The folder path within the bucket where the file will be stored.
 * @returns The public URL of the uploaded file.
 * @throws An error if the upload fails.
 */
export const uploadFile = async (
  file: File,
  bucket: string,
  path: string
): Promise<string> => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `${path}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) {
    console.error('Supabase Storage upload error:', uploadError);
    throw new Error(`Failed to upload file to ${bucket}: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error('Failed to get public URL for the uploaded file.');
  }

  return data.publicUrl;
};

/**
 * Gets a signed URL for a private file in Supabase Storage.
 * Use this for documents that require authentication (e.g., athlete-documents).
 *
 * @param bucket The name of the storage bucket.
 * @param path The full path to the file within the bucket.
 * @param expiresIn Expiration time in seconds (default: 1 hour).
 * @returns A signed URL valid for the specified duration.
 * @throws An error if the signed URL cannot be generated.
 */
export const getSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error('Supabase Storage signed URL error:', error);
    throw new Error(`Failed to get signed URL for ${bucket}/${path}`);
  }

  return data.signedUrl;
};