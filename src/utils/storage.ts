// =============================================================================
// Supabase Storage Helper for Photo Uploads
// =============================================================================
// Adheres strictly to the `photo-upload-flow` skill:
//   - Bucket name: `repair-photos` (private bucket)
//   - File path convention: `{repair_request_id}/{uuid}.jpg`
//   - Pure base64 to ArrayBuffer decoder for cross-platform binary upload
// =============================================================================

import { supabase } from '../config/supabase';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Robust base64 to ArrayBuffer decoder.
 * Uses global `atob` if available (Hermes / modern JS), or fallbacks to pure JS.
 */
export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '').trim();

  if (typeof atob === 'function') {
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Pure JS fallback
  let bufferLength = cleanBase64.length * 0.75;
  if (cleanBase64.endsWith('==')) bufferLength -= 2;
  else if (cleanBase64.endsWith('=')) bufferLength -= 1;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const encoded1 = BASE64_CHARS.indexOf(cleanBase64[i]);
    const encoded2 = BASE64_CHARS.indexOf(cleanBase64[i + 1]);
    const encoded3 = BASE64_CHARS.indexOf(cleanBase64[i + 2]);
    const encoded4 = BASE64_CHARS.indexOf(cleanBase64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && encoded3 !== -1) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64 && encoded4 !== -1) {
      bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }
  }

  return arrayBuffer;
}

/**
 * Upload a photo to the `repair-photos` bucket and link it in the `repair_photos` table.
 *
 * @param repairRequestId The UUID of the repair_request row (must exist before upload due to RLS).
 * @param photoBase64 The base64 string of the compressed photo.
 * @param photoId Optional unique identifier for the photo filename (defaults to timestamp-random).
 */
export async function uploadRepairPhoto(
  repairRequestId: string,
  photoBase64: string,
  photoId?: string
): Promise<{ filePath: string; photoRowId: string }> {
  const uniqueId = photoId || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const filePath = `${repairRequestId}/${uniqueId}.jpg`;
  const fileBuffer = decodeBase64ToArrayBuffer(photoBase64);

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('repair-photos')
    .upload(filePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // 2. Insert record into `public.repair_photos`
  const { data: insertedRow, error: insertError } = await supabase
    .from('repair_photos')
    .insert({
      repair_request_id: repairRequestId,
      photo_url: filePath,
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Database insert failed: ${insertError.message}`);
  }

  return {
    filePath,
    photoRowId: insertedRow.id,
  };
}

/**
 * Generate a short-lived signed URL for a photo stored in the private `repair-photos` bucket.
 * Per the `photo-upload-flow` skill, photos are kept private and accessed via signed URLs
 * (default: 3600 seconds / 1 hour).
 *
 * @param filePath The storage path (e.g. "requestId/photoId.jpg") or legacy URL.
 * @param expiresIn Time in seconds before the signed URL expires (default: 3600).
 */
export async function getSignedPhotoUrl(filePath: string, expiresIn = 3600): Promise<string> {
  // If the path contains the full URL or bucket prefix, strip it down to the relative object path
  const relativePath = filePath
    .replace(/^.*repair-photos\//, '')
    .replace(/^\/+/, '');

  const { data, error } = await supabase.storage
    .from('repair-photos')
    .createSignedUrl(relativePath, expiresIn);

  if (error) {
    console.error('Error generating signed URL for:', relativePath, error.message);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Batch generate signed URLs for an array of photo file paths.
 */
export async function getSignedPhotoUrls(filePaths: string[], expiresIn = 3600): Promise<string[]> {
  const promises = filePaths.map(async (path) => {
    try {
      return await getSignedPhotoUrl(path, expiresIn);
    } catch {
      return '';
    }
  });

  const urls = await Promise.all(promises);
  return urls.filter((url) => Boolean(url));
}

