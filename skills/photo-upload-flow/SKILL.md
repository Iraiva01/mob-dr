---
name: photo-upload-flow
description: Use this skill when implementing photo upload functionality for repair requests — capturing or picking device photos, uploading them to Supabase Storage, and linking them to a repair request via the repair_photos table. Ensures a consistent, cost-aware upload pattern across the app.
---

# Photo Upload Flow (Supabase Storage)

## When to use this
Any time a screen needs to let the customer attach photos of their device (currently: the Submit New Request screen, limited to 1–2 photos), or any future screen that displays or manages those photos.

## Storage convention

- Bucket name: `repair-photos`.
- File path convention: `{repair_request_id}/{uuid}.jpg` — group photos by request so they're easy to locate and clean up if a request is deleted.
- Keep the bucket **private** (not public) — access photos via signed URLs generated on demand, not permanent public links, since these are customer device photos.

## Upload sequence

1. Customer picks/captures a photo using the device's image picker (e.g. `expo-image-picker`).
2. Compress/resize the image client-side before upload (target roughly 1080px max dimension, JPEG quality ~0.7) to minimize Supabase Storage usage and keep the app within the free tier.
3. Upload the compressed image to the `repair-photos` bucket under the path convention above.
4. On successful upload, insert a row into `repair_photos` with `repair_request_id`, `photo_url` (or storage path — prefer storing the path and generating signed URLs on read, not storing a permanent public URL), and `uploaded_at`.
5. If upload fails, surface a clear retry option to the user rather than silently dropping the photo — do not let the request submit without its photos succeeding, since the shop owner relies on them to assess the repair.

## Reading photos back

- When displaying photos (Request Detail screens, either side), generate a **signed URL** with a short expiry (e.g. 1 hour) via Supabase Storage rather than storing/reusing a permanent public URL.
- Do not fetch and re-generate signed URLs more often than necessary — cache them for the duration of the screen session.

## Limits to enforce

- Maximum 2 photos per repair request (per current product decision — confirm with the user before changing this).
- Reasonable file size cap client-side (e.g. reject or auto-compress anything over ~5MB before upload) to protect the free tier.

## Example prompt to the agent
"Implement the photo upload step of the Submit New Request screen using our photo-upload-flow skill, capped at 2 photos."
