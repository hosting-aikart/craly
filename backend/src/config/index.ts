import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT ?? '8080', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
  // Used to build absolute links back to the app in emails (e.g. "View Enquiry").
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  // Demo default — override in .env to redirect contact form notifications elsewhere.
  contactEmailTo: process.env.CONTACT_EMAIL_TO ?? 'vishalsambare2004@gmail.com',
  contactEmailFrom: process.env.CONTACT_EMAIL_FROM ?? 'Craly <onboarding@resend.dev>',
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
