import { S3Client } from '@aws-sdk/client-s3';
import { createS3CompatibleStorage } from './s3Compatible';
import type { StorageProvider } from './types';

/**
 * Cloudflare R2 adapter (STORAGE_PROVIDER=r2 — the Render deployment).
 *
 * R2 speaks the S3 API at its own endpoint,
 * https://<account-id>.r2.cloudflarestorage.com, authenticated with an R2
 * API token's access key + secret. Region is always "auto" for R2.
 */
export interface R2Settings {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
}

/** Names of the R2 env vars that are not set (empty list = fully configured). */
export function missingR2Settings(s: R2Settings): string[] {
  return [
    !s.accountId && 'R2_ACCOUNT_ID',
    !s.accessKeyId && 'R2_ACCESS_KEY_ID',
    !s.secretAccessKey && 'R2_SECRET_ACCESS_KEY',
    !s.bucket && 'R2_BUCKET_NAME',
    !s.endpoint && 'R2_ENDPOINT',
  ].filter((v): v is string => Boolean(v));
}

export function createR2Storage(s: R2Settings): StorageProvider {
  const client = new S3Client({
    region: 'auto',
    endpoint: s.endpoint,
    credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey },
  });
  return createS3CompatibleStorage('r2', client, s.bucket);
}
