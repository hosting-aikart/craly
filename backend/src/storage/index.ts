import config from '../config/index';
import type { AppError } from '../middlewares/errorHandler';
import { createR2Storage, missingR2Settings } from './r2';
import { createS3Storage, missingS3Settings } from './s3';
import type { StorageProvider, StorageProviderName } from './types';

/**
 * Craly's file storage — the ONLY module controllers import for files
 * (KYC/verification documents, worksite photos). Provider-neutral:
 *
 *   STORAGE_PROVIDER=r2  → ./r2.ts → Cloudflare R2   (Render; the default)
 *   STORAGE_PROVIDER=s3  → ./s3.ts → AWS S3          (EC2, via the instance IAM role)
 *
 * Only the selected provider's settings are validated. If they're
 * incomplete (or the provider name is unknown) the app still starts —
 * exactly as before — and every storage call fails with a 503 whose
 * client-facing message reveals nothing about the infrastructure; the
 * details are logged server-side.
 */

export { buildDocumentStorageKey, buildWorksitePhotoStorageKey } from './keys';
export type { StorageProvider, StorageProviderName } from './types';

const SUPPORTED_PROVIDERS: StorageProviderName[] = ['r2', 's3'];

type StorageConfig = Pick<
  typeof config,
  'storageProvider' | 'r2AccountId' | 'r2AccessKeyId' | 'r2SecretAccessKey' | 'r2Bucket' | 'r2Endpoint' | 's3Bucket' | 'awsRegion'
>;

export interface ResolvedStorage {
  /** The STORAGE_PROVIDER value as configured. */
  name: string;
  /** The ready provider, or null when misconfigured. */
  provider: StorageProvider | null;
  /** Why `provider` is null — for logs only (never sent to clients). */
  problem: string | null;
}

/**
 * Builds the provider named by `cfg.storageProvider`. Pure apart from
 * constructing an SDK client (no network), so tests can call it with any
 * settings.
 */
export function resolveStorage(cfg: StorageConfig): ResolvedStorage {
  const name = cfg.storageProvider;

  if (name === 'r2') {
    const settings = {
      accountId: cfg.r2AccountId,
      accessKeyId: cfg.r2AccessKeyId,
      secretAccessKey: cfg.r2SecretAccessKey,
      bucket: cfg.r2Bucket,
      endpoint: cfg.r2Endpoint,
    };
    const missing = missingR2Settings(settings);
    return missing.length
      ? { name, provider: null, problem: `STORAGE_PROVIDER=r2 but ${missing.join(', ')} not set` }
      : { name, provider: createR2Storage(settings), problem: null };
  }

  if (name === 's3') {
    const settings = { bucket: cfg.s3Bucket, region: cfg.awsRegion };
    const missing = missingS3Settings(settings);
    return missing.length
      ? { name, provider: null, problem: `STORAGE_PROVIDER=s3 but ${missing.join(', ')} not set` }
      : { name, provider: createS3Storage(settings), problem: null };
  }

  return {
    name,
    provider: null,
    problem: `STORAGE_PROVIDER="${name}" is not supported (use one of: ${SUPPORTED_PROVIDERS.join(', ')})`,
  };
}

// Resolved once at startup from the environment.
const active = resolveStorage(config);
if (active.problem) {
  console.warn(`[storage] ${active.problem} — file upload/download will return 503 until configured.`);
} else {
  console.log(`[storage] provider: ${active.name}`);
}

function storageUnavailable(): AppError {
  const err: AppError = new Error('File storage is temporarily unavailable. Please try again later.');
  err.statusCode = 503;
  return err;
}

function getProvider(): StorageProvider {
  if (!active.provider) {
    console.error(`[storage] request rejected: ${active.problem}`);
    throw storageUnavailable();
  }
  return active.provider;
}

/**
 * Runs one provider call, adding which provider/operation/key failed to the
 * server log. The original error is re-thrown unchanged, so the central
 * error handler still answers the client with its generic message.
 */
async function withProvider<T>(operation: string, key: string, fn: (p: StorageProvider) => Promise<T>): Promise<T> {
  const provider = getProvider();
  try {
    return await fn(provider);
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error(`[storage:${provider.name}] ${operation} failed for ${key} — ${reason}`);
    throw err;
  }
}

/** Name of the active provider ('r2' / 's3'), or null when storage is misconfigured. */
export function getStorageProviderName(): StorageProviderName | null {
  return active.provider?.name ?? null;
}

/** Uploads a buffer as a private object. Throws 503 if storage isn't configured. */
export function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  return withProvider('putObject', key, (p) => p.putObject(key, body, contentType));
}

/** Mints a short-lived signed GET URL. Default TTL matches the storage plan (120s). */
export function getSignedGetUrl(key: string, ttlSeconds = 120): Promise<string> {
  return withProvider('getSignedGetUrl', key, (p) => p.getSignedGetUrl(key, ttlSeconds));
}

/** Permanently deletes the object — the "anonymize" half of delete/anonymize. */
export function deleteObject(key: string): Promise<void> {
  return withProvider('deleteObject', key, (p) => p.deleteObject(key));
}
