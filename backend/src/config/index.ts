import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
} as const;

if (!config.databaseUrl) {
  console.warn('[config] DATABASE_URL is not set — DB calls will fail.');
}

export default config;
