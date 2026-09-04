-- =============================================================================
-- Migration: Storage bucket + policies for repair photos
-- =============================================================================
-- Creates a private "repair-photos" bucket and RLS policies so that:
--   1. Customers can upload/read photos only for their own repair requests
--   2. Shop owner can read all photos (to review requests)
--
-- Storage path convention: {repair_request_id}/{filename}
-- This ties each photo to a specific repair request via the folder name.
-- =============================================================================

-- 1. Create the private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repair-photos',
  'repair-photos',
  false,  -- private: requires auth + policy check to access
  5242880,  -- 5 MB max per file (plenty for phone photos)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']  -- only image types
);

-- 2. UPLOAD policy: customers can upload photos to folders matching their own repair requests
-- Path format: repair-photos/{repair_request_id}/{filename}
-- The folder name (path token index 0) must be a repair_request_id that belongs to the uploader.
CREATE POLICY "Customers can upload own repair photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'repair-photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM repair_requests WHERE customer_id = auth.uid()
      )
    )
  );

-- 3. SELECT policy: customers can view photos for their own repair requests
CREATE POLICY "Customers can read own repair photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'repair-photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM repair_requests WHERE customer_id = auth.uid()
      )
    )
  );

-- 4. SELECT policy: shop owner can view ALL repair photos (to review incoming requests)
CREATE POLICY "Shop owner can read all repair photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'repair-photos'
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
    )
  );

-- 5. DELETE policy: customers can delete their own photos (e.g., re-upload a better one)
CREATE POLICY "Customers can delete own repair photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'repair-photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM repair_requests WHERE customer_id = auth.uid()
      )
    )
  );

-- 6. UPDATE policy: customers can update (replace) their own photos
CREATE POLICY "Customers can update own repair photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'repair-photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM repair_requests WHERE customer_id = auth.uid()
      )
    )
  );
