/**
 * Provider-neutral object storage contract. Controllers only ever see this
 * (through src/storage/index.ts) — never an SDK client, a bucket name or a
 * credential — so swapping Cloudflare R2 for AWS S3 (or adding another
 * backend later) is a configuration change, not a code change.
 */

/** Every backend Craly can store files in. Add a name here (plus an adapter) to support another one. */
export type StorageProviderName = 'r2' | 's3';

export interface StorageProvider {
  readonly name: StorageProviderName;

  /** Stores `body` under `key` as a private object. */
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;

  /** Returns a short-lived URL that lets the holder GET this one object, valid for `ttlSeconds`. */
  getSignedGetUrl(key: string, ttlSeconds: number): Promise<string>;

  /** Permanently deletes the object. */
  deleteObject(key: string): Promise<void>;
}
