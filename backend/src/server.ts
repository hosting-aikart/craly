import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/index';
import apiRouter from './routes/index';
import { errorHandler } from './middlewares/errorHandler';
import { initSocketServer } from './socket/index';

const app = express();

// Trust the first proxy hop (needed for correct req.ip / secure cookies
// behind a reverse proxy like Nginx, Vercel, Render, etc.)
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// Basic security headers (no extra dependency required)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});

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

server.listen(config.port, () => {
  console.log(`[server] Craly API running on http://localhost:${config.port}`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
  console.log(`[server] Allowed origins: ${config.allowedOrigins.join(', ')}`);
});

// Graceful shutdown on SIGINT/SIGTERM (Ctrl+C, container stop, etc.)
function shutdown(signal: string): void {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('[server] Closed remaining connections');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
