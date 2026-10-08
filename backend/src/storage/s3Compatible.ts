import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, StorageProviderName } from './types';

/**
 * Shared implementation for every S3-API-compatible backend. Cloudflare R2
 * and AWS S3 accept the exact same PutObject / GetObject / DeleteObject
 * requests and the same presigned-URL format — they differ only in how the
 * S3Client is built (endpoint, region, credentials), which r2.ts and s3.ts
 * handle. Keeping the operations here means they are written once.
 *
 * Objects are always private: no ACL is ever set (R2 has no public ACLs;
 * the S3 bucket blocks public access), so the only way to read a file is a
 * server-minted signed URL.
 */
export function createS3CompatibleStorage(name: StorageProviderName, client: S3Client, bucket: string): StorageProvider {
  return {
    name,

    async putObject(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },

    getSignedGetUrl(key, ttlSeconds) {
      // Signed locally with the client's credentials — no network call.
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: ttlSeconds });
    },

    async deleteObject(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
