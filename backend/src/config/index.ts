import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT ?? '8080', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  contactEmailTo: process.env.CONTACT_EMAIL_TO ?? 'vishalsambare2004@gmail.com',
  contactEmailFrom: process.env.CONTACT_EMAIL_FROM ?? 'Craly <noreply@craly.co>',

  // NOTE: no MSG91/SMS config here. Signup verification is email-only —
  // phone OTP/SMS is intentionally disconnected from the active auth flow
  // (phone number itself is still a normal signup field). The MSG91
  // integration is kept intact and self-contained in utils/sms.ts (it
  // reads process.env.MSG91_AUTH_KEY directly) so it can be reintroduced
  // later without touching this file again — it is simply unimported by
  // anything in the active app right now.

  // Google OAuth 2.0 Credentials
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:8080/api/google/calendar/callback',

  // File storage (KYC documents, worksite photos) — see src/storage/.
  // STORAGE_PROVIDER picks the backend: 'r2' = Cloudflare R2 (Render) or
  // 's3' = AWS S3 (EC2). Unset or blank means 'r2', so existing deployments keep
  // working unchanged. Only the selected provider's settings are required;
  // src/storage/index.ts validates them and answers 503 until complete.
  storageProvider: (process.env.STORAGE_PROVIDER?.trim() || 'r2').toLowerCase(),

  // Cloudflare R2 — used only when STORAGE_PROVIDER=r2. All five required.
  r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2Bucket: process.env.R2_BUCKET_NAME ?? '',
  r2Endpoint: process.env.R2_ENDPOINT ?? '',

  // AWS S3 — used only when STORAGE_PROVIDER=s3. No access keys here on
  // purpose: the AWS SDK takes credentials from the EC2 instance IAM role
  // (see src/storage/s3.ts).
  s3Bucket: process.env.S3_BUCKET_NAME ?? '',
  awsRegion: process.env.AWS_REGION ?? '',
} as const;

if (!config.databaseUrl) {
  console.warn('[config] DATABASE_URL is not set — DB calls will fail.');
}

if (!config.jwtSecret) {
  console.warn('[config] JWT_SECRET is not set — auth calls will fail.');
}

if (!config.resendApiKey) {
  console.warn('[config] RESEND_API_KEY is not set — contact form emails will fail.');
}

export default config;
