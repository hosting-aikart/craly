/**
 * Storage abstraction tests (src/storage) — Cloudflare R2 and AWS S3.
 *
 * Never talks to R2 or S3: S3Client.prototype.send is replaced by a recorder
 * (so put/delete never leave the process), presigned URLs are computed
 * locally, all credentials are fake, and the EC2 metadata service and
 * shared AWS config files are disabled so no real credentials can be found.
 *
 * Two layers:
 *   1. in-process — resolveStorage() with explicit settings (selection,
 *      validation, client configuration, credential chain);
 *   2. child processes — STORAGE_PROVIDER etc. set exactly as a deployment
 *      would, then the real src/storage public API is called, to prove the
 *      env → config → provider → SDK routing end to end.
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/test_storage.ts
 */
import { spawnSync } from 'child_process';
import path from 'path';

const BACKEND_DIR = path.resolve(__dirname, '..');

// Every variable the storage code (or the AWS SDK) could read. Children get
// all of them explicitly — empty unless a case sets it — so neither the
// developer's backend/.env (dotenv never overrides an existing key) nor any
// real AWS credentials on this machine can leak into a test.
const ISOLATED_ENV: Record<string, string> = {
  STORAGE_PROVIDER: '',
  R2_ACCOUNT_ID: '', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: '', R2_BUCKET_NAME: '', R2_ENDPOINT: '',
  S3_BUCKET_NAME: '', AWS_REGION: '', AWS_DEFAULT_REGION: '',
  AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', AWS_SESSION_TOKEN: '', AWS_PROFILE: '',
  AWS_EC2_METADATA_DISABLED: 'true',
  AWS_SHARED_CREDENTIALS_FILE: '/nonexistent/aws-credentials',
  AWS_CONFIG_FILE: '/nonexistent/aws-config',
  AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: '', AWS_CONTAINER_CREDENTIALS_FULL_URI: '',
  AWS_WEB_IDENTITY_TOKEN_FILE: '', AWS_ROLE_ARN: '',
  DATABASE_URL: '', JWT_SECRET: 'test', RESEND_API_KEY: 'test',
};
// Parent only — a child (this same file) must keep the env the parent passed it.
if (process.env.STORAGE_TEST_CHILD !== '1') for (const [k, v] of Object.entries(ISOLATED_ENV)) process.env[k] = v;

const R2_ENV = {
  R2_ACCOUNT_ID: 'testaccount',
  R2_ACCESS_KEY_ID: 'R2TESTACCESSKEY',
  R2_SECRET_ACCESS_KEY: 'r2-test-secret-not-real',
  R2_BUCKET_NAME: 'craly-r2-test-bucket',
  R2_ENDPOINT: 'https://testaccount.r2.cloudflarestorage.com',
};
const S3_ENV = {
  S3_BUCKET_NAME: 'craly-prod-media-2026-507941515127-ap-south-1-an',
  AWS_REGION: 'ap-south-1',
};
// Only used where a test must SIGN an S3 URL without an EC2 role available.
const FAKE_AWS_KEYS = { AWS_ACCESS_KEY_ID: 'AKIATESTONLYNOTREAL0', AWS_SECRET_ACCESS_KEY: 'test-secret-not-real' };

function runChild(extraEnv: Record<string, string>): any {
  const r = spawnSync(process.execPath, ['-r', 'ts-node/register/transpile-only', __filename], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ...ISOLATED_ENV, ...extraEnv, STORAGE_TEST_CHILD: '1' },
    encoding: 'utf8',
    timeout: 60_000,
  });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('@@RESULT@@'));
  if (!line) throw new Error(`child produced no result (exit ${r.status}): ${r.stderr}`);
  return JSON.parse(line.slice('@@RESULT@@'.length));
}

// ── harness ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
function assert(condition: unknown, name: string, detail?: unknown): void {
  if (condition) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`); }
}
const query = (url: string) => new URL(url).searchParams;

async function main(): Promise<void> {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { S3Client } = require('@aws-sdk/client-s3');
  const realSend = S3Client.prototype.send;
  // storage/index logs its (here: empty) provider config at import — expected, so muted.
  const [origLog, origWarn] = [console.log, console.warn];
  console.log = console.warn = () => {};
  const storage = require('../src/storage') as typeof import('../src/storage');
  [console.log, console.warn] = [origLog, origWarn];
  const { resolveStorage } = storage;

  const base = {
    storageProvider: '', r2AccountId: '', r2AccessKeyId: '', r2SecretAccessKey: '', r2Bucket: '', r2Endpoint: '', s3Bucket: '', awsRegion: '',
  };
  const r2Cfg = { ...base, storageProvider: 'r2', r2AccountId: R2_ENV.R2_ACCOUNT_ID, r2AccessKeyId: R2_ENV.R2_ACCESS_KEY_ID, r2SecretAccessKey: R2_ENV.R2_SECRET_ACCESS_KEY, r2Bucket: R2_ENV.R2_BUCKET_NAME, r2Endpoint: R2_ENV.R2_ENDPOINT };
  const s3Cfg = { ...base, storageProvider: 's3', s3Bucket: S3_ENV.S3_BUCKET_NAME, awsRegion: S3_ENV.AWS_REGION };

  console.log('== 1-2. Provider selection');
  const r2 = resolveStorage(r2Cfg);
  assert(r2.provider?.name === 'r2' && r2.problem === null, 'STORAGE_PROVIDER=r2 selects the R2 implementation', r2.problem);
  const s3 = resolveStorage(s3Cfg);
  assert(s3.provider?.name === 's3' && s3.problem === null, 'STORAGE_PROVIDER=s3 selects the S3 implementation', s3.problem);
  const bad = resolveStorage({ ...r2Cfg, storageProvider: 'gcs' });
  assert(bad.provider === null && /not supported/.test(bad.problem ?? ''), 'unknown STORAGE_PROVIDER is rejected (no silent fallback)', bad.problem);

  console.log('\n== 3. Missing R2 variables fail only when provider=r2');
  const r2Missing = resolveStorage({ ...base, storageProvider: 'r2', r2Bucket: 'b' });
  assert(r2Missing.provider === null && r2Missing.problem === 'STORAGE_PROVIDER=r2 but R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT not set',
    'provider=r2 with R2 vars missing → unavailable, names exactly the missing vars', r2Missing.problem);
  const s3NoR2 = resolveStorage(s3Cfg); // all R2 fields empty
  assert(s3NoR2.provider?.name === 's3', 'provider=s3 with NO R2 vars at all → still fine');

  console.log('\n== 4. Missing S3 bucket/region fail only when provider=s3');
  assert(resolveStorage({ ...s3Cfg, s3Bucket: '' }).problem === 'STORAGE_PROVIDER=s3 but S3_BUCKET_NAME not set', 'provider=s3 without S3_BUCKET_NAME → unavailable');
  assert(resolveStorage({ ...s3Cfg, awsRegion: '' }).problem === 'STORAGE_PROVIDER=s3 but AWS_REGION not set', 'provider=s3 without AWS_REGION → unavailable');
  assert(resolveStorage(r2Cfg).provider?.name === 'r2', 'provider=r2 with NO S3 vars at all → still fine');

  console.log('\n== 5. S3 does not require AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY');
  const captured: any[] = [];
  S3Client.prototype.send = async function (command: any) {
    captured.push({ command: command.constructor.name, input: command.input, region: await this.config.region(), endpoint: this.config.endpoint ? (await this.config.endpoint()).hostname : null });
    return {};
  };
  assert(!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY, 'test process has no AWS keys in its environment');
  const s3NoKeys = resolveStorage(s3Cfg);
  assert(s3NoKeys.provider !== null && s3NoKeys.problem === null, 'S3 provider is created with no AWS keys configured');
  await s3NoKeys.provider!.putObject('k/put', Buffer.from('x'), 'image/png');
  assert(captured.at(-1)?.command === 'PutObjectCommand' && captured.at(-1)?.region === 'ap-south-1' && captured.at(-1)?.endpoint === null,
    'S3 client: region ap-south-1, default AWS endpoint (no custom endpoint)', captured.at(-1));
  let chainError: any = null;
  try { await s3NoKeys.provider!.getSignedGetUrl('k/get', 120); } catch (e) { chainError = e; }
  assert(chainError && /CredentialsProviderError|Could not load credentials/i.test(`${chainError.name} ${chainError.message}`),
    'with no keys and no instance role reachable, signing asks the AWS default credential chain (would be the EC2 role) — no static keys baked in', chainError && `${chainError.name}: ${chainError.message}`.slice(0, 120));

  console.log('\n== R2 client configuration (unchanged from utils/r2.ts)');
  await r2.provider!.putObject('k/r2', Buffer.from('x'), 'application/pdf');
  assert(captured.at(-1)?.endpoint === 'testaccount.r2.cloudflarestorage.com' && captured.at(-1)?.region === 'auto' && captured.at(-1)?.input.Bucket === R2_ENV.R2_BUCKET_NAME,
    'R2 client: R2 endpoint, region "auto", R2 bucket', captured.at(-1));
  const r2Url = await r2.provider!.getSignedGetUrl('contractors/c/verification/d/original', 120);
  assert(new URL(r2Url).hostname.endsWith('r2.cloudflarestorage.com') && query(r2Url).get('X-Amz-Expires') === '120' && (query(r2Url).get('X-Amz-Credential') ?? '').startsWith('R2TESTACCESSKEY/'),
    'R2 signed URL: R2 host, 120s expiry, signed with the R2 access key', new URL(r2Url).hostname);
  assert(!r2Url.includes(R2_ENV.R2_SECRET_ACCESS_KEY), 'R2 secret key never appears in the signed URL');
  S3Client.prototype.send = realSend;

  console.log('\n== 6-8. End-to-end routing through src/storage (separate processes, env as deployed)');
  const r2Run = runChild({ STORAGE_PROVIDER: 'r2', ...R2_ENV });
  assert(r2Run.provider === 'r2', 'STORAGE_PROVIDER=r2 → getStorageProviderName() = r2');
  assert(r2Run.put.ok && r2Run.sends[0]?.command === 'PutObjectCommand' && r2Run.sends[0].bucket === R2_ENV.R2_BUCKET_NAME
    && r2Run.sends[0].endpointHost === 'testaccount.r2.cloudflarestorage.com' && r2Run.sends[0].key === 'contractors/contractor-1/verification/document-1/original'
    && r2Run.sends[0].contentType === 'application/pdf' && r2Run.sends[0].bodyBytes === 5,
    'r2: putObject → PutObject on the R2 bucket/endpoint with key, body and content type', r2Run.sends[0]);
  assert(r2Run.url.ok && new URL(r2Run.url.value).hostname.endsWith('r2.cloudflarestorage.com') && query(r2Run.url.value).get('X-Amz-Expires') === '120'
    && query(r2Run.url3600.value).get('X-Amz-Expires') === '3600', 'r2: getSignedGetUrl → R2-signed URL, default 120s TTL, explicit 3600s honoured');
  assert(r2Run.del.ok && r2Run.sends[1]?.command === 'DeleteObjectCommand' && r2Run.sends[1].bucket === R2_ENV.R2_BUCKET_NAME,
    'r2: deleteObject → DeleteObject on the R2 bucket', r2Run.sends[1]);

  const s3Run = runChild({ STORAGE_PROVIDER: 's3', ...S3_ENV, ...FAKE_AWS_KEYS });
  assert(s3Run.provider === 's3', 'STORAGE_PROVIDER=s3 → getStorageProviderName() = s3');
  assert(s3Run.put.ok && s3Run.sends[0]?.command === 'PutObjectCommand' && s3Run.sends[0].bucket === S3_ENV.S3_BUCKET_NAME
    && s3Run.sends[0].region === 'ap-south-1' && s3Run.sends[0].endpointHost === null,
    's3: putObject → PutObject on the S3 bucket in ap-south-1 (AWS endpoint)', s3Run.sends[0]);
  const s3Host = s3Run.url.ok ? new URL(s3Run.url.value).hostname : '';
  assert(s3Run.url.ok && s3Host.includes(S3_ENV.S3_BUCKET_NAME) && s3Host.endsWith('amazonaws.com') && query(s3Run.url.value).get('X-Amz-Expires') === '120',
    's3: getSignedGetUrl → S3-signed URL for the bucket, default 120s TTL', s3Host);
  assert(s3Run.del.ok && s3Run.sends[1]?.command === 'DeleteObjectCommand' && s3Run.sends[1].bucket === S3_ENV.S3_BUCKET_NAME,
    's3: deleteObject → DeleteObject on the S3 bucket', s3Run.sends[1]);

  const s3NoKeysRun = runChild({ STORAGE_PROVIDER: 's3', ...S3_ENV });
  assert(s3NoKeysRun.provider === 's3' && s3NoKeysRun.put.ok && s3NoKeysRun.del.ok && !s3NoKeysRun.logs.some((l: string) => /^\[storage\].*not set/.test(l)),
    's3 with NO AWS keys in env: provider active, no config warnings (keys are never required)',
    { provider: s3NoKeysRun.provider, put: s3NoKeysRun.put, del: s3NoKeysRun.del, logs: s3NoKeysRun.logs });

  const defaultRun = runChild({ ...R2_ENV }); // STORAGE_PROVIDER present but blank ("")
  const unsetRun = (() => {
    // STORAGE_PROVIDER truly absent (not just empty) — the existing Render deployment's situation.
    const env = { ...process.env, ...ISOLATED_ENV, ...R2_ENV, STORAGE_TEST_CHILD: '1' } as Record<string, string | undefined>;
    delete env.STORAGE_PROVIDER;
    const r = spawnSync(process.execPath, ['-r', 'ts-node/register/transpile-only', __filename], { cwd: BACKEND_DIR, env: env as NodeJS.ProcessEnv, encoding: 'utf8', timeout: 60_000 });
    return JSON.parse((r.stdout.split('\n').find((l) => l.startsWith('@@RESULT@@')) ?? '@@RESULT@@{}').slice('@@RESULT@@'.length));
  })();
  assert(unsetRun.provider === 'r2' && unsetRun.put.ok, 'STORAGE_PROVIDER unset → defaults to r2 (existing Render deploy keeps working without env changes)', unsetRun.provider);
  assert(defaultRun.provider === 'r2' && defaultRun.put.ok, 'STORAGE_PROVIDER set but blank → also r2 (same as unset)', defaultRun.provider);

  console.log('\n== Misconfiguration behaviour (app keeps running, storage calls 503, nothing leaks)');
  const r2Broken = runChild({ STORAGE_PROVIDER: 'r2', R2_BUCKET_NAME: 'only-bucket', ...S3_ENV });
  assert(r2Broken.provider === null && r2Broken.put.statusCode === 503 && r2Broken.url.statusCode === 503 && r2Broken.del.statusCode === 503 && r2Broken.sends.length === 0,
    'provider=r2, R2 incomplete → every call 503, no SDK request made', { put: r2Broken.put, sends: r2Broken.sends.length });
  assert(r2Broken.put.message === 'File storage is temporarily unavailable. Please try again later.' && !/R2_|bucket|cloudflare/i.test(r2Broken.put.message),
    'client-facing 503 message names no env vars / provider / bucket', r2Broken.put.message);
  assert(r2Broken.logs.some((l: string) => l.includes('[storage] STORAGE_PROVIDER=r2 but R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT not set')),
    'server log explains exactly what is missing');
  const s3Broken = runChild({ STORAGE_PROVIDER: 's3', AWS_REGION: 'ap-south-1', ...R2_ENV });
  assert(s3Broken.provider === null && s3Broken.put.statusCode === 503 && s3Broken.sends.length === 0 && s3Broken.logs.some((l: string) => l.includes('S3_BUCKET_NAME not set')),
    'provider=s3, bucket missing → 503 even though R2 is fully configured (no silent fallback to R2)');

  console.log('\n== Secrets');
  const allLogs = [r2Run, s3Run, s3NoKeysRun, r2Broken, s3Broken, unsetRun].flatMap((r) => r.logs ?? []).join('\n');
  assert(!allLogs.includes(R2_ENV.R2_SECRET_ACCESS_KEY) && !allLogs.includes(FAKE_AWS_KEYS.AWS_SECRET_ACCESS_KEY) && !allLogs.includes(R2_ENV.R2_ACCESS_KEY_ID),
    'no access key or secret appears in any storage log line');

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

// ── child mode: import the real storage module under the given env ──────────
async function childMain(): Promise<void> {
  {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client } = require('@aws-sdk/client-s3');
    const sends: any[] = [];
    S3Client.prototype.send = async function (command: any) {
      const endpoint = this.config.endpoint ? await this.config.endpoint() : null;
      sends.push({
        command: command.constructor.name,
        bucket: command.input.Bucket,
        key: command.input.Key,
        contentType: command.input.ContentType ?? null,
        bodyBytes: command.input.Body ? command.input.Body.length : null,
        region: await this.config.region(),
        endpointHost: endpoint ? endpoint.hostname : null,
      });
      return {};
    };
    const logs: string[] = [];
    for (const level of ['log', 'warn', 'error'] as const) console[level] = (...a: unknown[]) => { logs.push(a.map(String).join(' ')); };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const storage = require('../src/storage');
    const out: any = { provider: storage.getStorageProviderName(), sends, logs };
    const attempt = async (label: string, fn: () => Promise<unknown>) => {
      try { out[label] = { ok: true, value: await fn() }; } catch (e: any) { out[label] = { ok: false, statusCode: e.statusCode ?? null, name: e.name, message: e.message }; }
    };
    const key = storage.buildDocumentStorageKey('contractor-1', 'document-1');
    await attempt('put', () => storage.putObject(key, Buffer.from('hello'), 'application/pdf'));
    await attempt('url', () => storage.getSignedGetUrl(key));
    await attempt('url3600', () => storage.getSignedGetUrl(key, 3600));
    await attempt('del', () => storage.deleteObject(key));
    process.stdout.write(`\n@@RESULT@@${JSON.stringify(out)}\n`);
    process.exit(0);
  }
}

// Entry point (at the end so every declaration above is initialised).
if (process.env.STORAGE_TEST_CHILD === '1') void childMain();
else void main();
