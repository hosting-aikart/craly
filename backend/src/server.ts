import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/index';
import apiRouter from './routes/index';
import whatsappWebhookRoutes from './routes/whatsappWebhookRoutes';
import { stopWhatsAppProducer } from './queue/whatsappQueue';
import { errorHandler } from './middlewares/errorHandler';
import { initSocketServer } from './socket/index';
import { healthCheck } from './controllers/healthController';
import { buildCorsOptions } from './utils/corsOrigin';

const app = express();

// Trust the first proxy hop (needed for correct req.ip / secure cookies
// behind a reverse proxy like Nginx, Vercel, Render, etc.)
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────────────────────

// CORS: Craly's own HTTPS sites (craly.co, www.craly.co, …) plus
// ALLOWED_ORIGINS, with credentials — see utils/corsOrigin.ts. Runs first,
// so Express's own error responses (401/403/413/…) carry CORS headers too.
app.use(cors(buildCorsOptions(config.allowedOrigins)));

// Basic security headers (no extra dependency required)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});

// WhatsApp webhook — before express.json(): Meta's X-Hub-Signature-256 is
// an HMAC of the raw body, which express.json() would consume.
app.use('/api/webhooks/whatsapp', whatsappWebhookRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Lightweight request logger — method, path, status, response time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[req] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({ name: 'Craly API', status: 'running', env: config.nodeEnv });
});

app.get('/health', healthCheck);

app.use('/api', apiRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

// ── Centralized Error Handler (must be last) ──────────────────────────────────

app.use(errorHandler);

// ── HTTP & Socket.IO Server Start ──────────────────────────────────────────────

const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
initSocketServer(server);

// Bind explicitly to 0.0.0.0 (all interfaces) rather than relying on
// Node's implicit default. Railway (and most PaaS containers) proxy
// traffic in from outside the container to config.port — if the process
// only accepts connections on the loopback interface, that traffic never
// reaches it even though the process itself is "running". Binding to
// 0.0.0.0 still accepts connections via localhost/127.0.0.1 too, so this
// doesn't change anything about local development.
const HOST = '0.0.0.0';

server.listen(config.port, HOST, () => {
  console.log(`[server] Craly API running on http://${HOST}:${config.port} (PORT env: ${process.env.PORT ?? 'unset, defaulted to 8080'})`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
  console.log(`[server] Allowed origins: ${config.allowedOrigins.join(', ')}`);
});

// Graceful shutdown on SIGINT/SIGTERM (Ctrl+C, container stop, etc.)
function shutdown(signal: string): void {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('[server] Closed remaining connections');
    // WhatsApp jobs are already committed to Postgres by the time a request
    // returns; this only closes the producer's pg-boss connection pool.
    stopWhatsAppProducer().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
