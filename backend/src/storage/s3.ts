import { S3Client } from '@aws-sdk/client-s3';
import { createS3CompatibleStorage } from './s3Compatible';
import type { StorageProvider } from './types';

/**
 * AWS S3 adapter (STORAGE_PROVIDER=s3 — the AWS EC2 deployment).
 *
 * Deliberately passes NO credentials: the AWS SDK then uses its default
 * credential provider chain, which on EC2 resolves to the instance's IAM
 * role (CralyEC2SSMRole) through the instance metadata service — short-lived
 * keys that AWS rotates automatically. So no AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY is needed (or wanted) in production. The same chain
 * also picks up a developer's `aws configure` profile when run locally.
 */
export interface S3Settings {
  bucket: string;
  region: string;
}

/** Names of the S3 env vars that are not set (empty list = fully configured). */
export function missingS3Settings(s: S3Settings): string[] {
  return [
    !s.bucket && 'S3_BUCKET_NAME',
    !s.region && 'AWS_REGION',
  ].filter((v): v is string => Boolean(v));
}

export function createS3Storage(s: S3Settings): StorageProvider {
  const client = new S3Client({ region: s.region });
  return createS3CompatibleStorage('s3', client, s.bucket);
}
