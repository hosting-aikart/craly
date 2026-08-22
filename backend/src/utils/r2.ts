import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';
import config, { isR2Configured } from '../config/index';
import type { AppError } from '../middlewares/errorHandler';

/**
 * Cloudflare R2 storage — private, S3-compatible. Every export fails fast
 * and clearly (503) if R2 isn't fully configured, rather than letting the
 * AWS SDK throw an opaque connection/credentials error. This is the one
 * place in the codebase that talks to R2; controllers never touch the SDK
 * directly.
 *
 * Storage keys are always generated server-side —
 * `contractors/{contractorId}/verification/{documentId}/original` — never
 * built from client input, which is what actually prevents path traversal
 * (see documentController.ts).
 */

function notConfigured(): AppError {
  const err: AppError = new Error(
    'Cloudflare R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_ENDPOINT in backend/.env',
  );
  err.statusCode = 503;
  return err;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isR2Configured) throw notConfigured();
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: config.r2Endpoint,
      credentials: {
        accessKeyId: config.r2AccessKeyId,
        secretAccessKey: config.r2SecretAccessKey,
      },
    });
  }
  return client;
}

export function buildDocumentStorageKey(contractorId: string, documentId: string): string {
  return `contractors/${contractorId}/verification/${documentId}/original`;
}

/** Uploads a buffer to the private bucket. Throws 503 if R2 isn't configured. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const s3 = getClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: config.r2Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Never publicly readable — R2 buckets have no ACL concept like AWS
      // S3's `public-read`; access is solely via scoped API tokens and, for
      // end users, short-lived signed URLs generated below.
    }),
  );
}

/** Mints a short-lived signed GET URL. Default TTL matches the storage plan (120s). */
export async function getSignedGetUrl(key: string, ttlSeconds = 120): Promise<string> {
  const s3 = getClient();
  return presign(s3, new GetObjectCommand({ Bucket: config.r2Bucket, Key: key }), { expiresIn: ttlSeconds });
}

/** Permanently deletes the object — the "anonymize" half of delete/anonymize. */
export async function deleteObject(key: string): Promise<void> {
  const s3 = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: config.r2Bucket, Key: key }));
}
