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
  contactEmailFrom: process.env.CONTACT_EMAIL_FROM ?? 'Craly <onboarding@resend.dev>',

  // MSG91 (SMS OTP) — OTP Widget REST API (widget/sendOtp, widget/verifyOtp),
  // authenticated via `tokenAuth` + `widgetId` in the request body (this is
  // the account authkey, reused as the widget's tokenAuth — see
  // utils/sms.ts). See utils/sms.ts, which fails fast
  // and clearly instead of silently pretending an SMS was sent when these
  // are missing. Unlike the old /api/v5/otp flow, the widget's default SMS
  // template needs no DLT registration, so no template ID is configured
  // here — MSG91 itself generates and verifies the phone OTP code (see
  // utils/sms.ts doc comment for the full trust-model explanation).
  msg91AuthKey: process.env.MSG91_AUTH_KEY ?? '',
  msg91WidgetId: process.env.MSG91_WIDGET_ID ?? '',

  // Google OAuth 2.0 Credentials
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:8080/api/google/calendar/callback',

  // Cloudflare R2 (S3-compatible) — private contractor document storage.
  // All five must be set for uploads/signed URLs to work; see utils/r2.ts,
  // which fails fast and clearly (503) instead of calling out to R2 with
  // partial config.
  r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2Bucket: process.env.R2_BUCKET_NAME ?? '',
  r2Endpoint: process.env.R2_ENDPOINT ?? '',
} as const;

export const isR2Configured = Boolean(
  config.r2AccountId && config.r2AccessKeyId && config.r2SecretAccessKey && config.r2Bucket && config.r2Endpoint,
);

export const isMsg91Configured = Boolean(config.msg91AuthKey && config.msg91WidgetId);

if (!isR2Configured) {
  console.warn('[config] R2_* env vars are not fully set — document upload/download will return 503 until configured.');
}

if (!config.databaseUrl) {
  console.warn('[config] DATABASE_URL is not set — DB calls will fail.');
}

if (!config.jwtSecret) {
  console.warn('[config] JWT_SECRET is not set — auth calls will fail.');
}

if (!config.resendApiKey) {
  console.warn('[config] RESEND_API_KEY is not set — contact form emails will fail.');
}

if (!isMsg91Configured) {
  const level = config.nodeEnv === 'production' ? 'error' : 'warn';
  console[level](
    '[config] MSG91_AUTH_KEY / MSG91_WIDGET_ID are not fully set — phone OTP SMS will ' +
    (config.nodeEnv === 'production' ? 'fail (no dev fallback in production).' : 'fall back to auto-accepting any 4-digit code in development only.'),
  );
}

export default config;
