/**
 * Object keys (paths inside the bucket) — identical for every storage
 * provider, so a file's key stored in the database means the same thing on
 * R2 and S3.
 *
 * Keys are always generated server-side from database ids, never built from
 * client input (file names, etc.) — that is what prevents path traversal
 * (see documentController.ts / worksitePhotoController.ts).
 */

export function buildDocumentStorageKey(contractorId: string, documentId: string): string {
  return `contractors/${contractorId}/verification/${documentId}/original`;
}

export function buildWorksitePhotoStorageKey(contractorId: string, photoId: string): string {
  return `contractors/${contractorId}/worksite-photos/${photoId}/original`;
}
