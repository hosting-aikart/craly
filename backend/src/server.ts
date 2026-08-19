import express from 'express';
import cors from 'cors';
import config from './config/index';
import apiRouter from './routes/index';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api', apiRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

// ── Centralized Error Handler (must be last) ──────────────────────────────────

app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`[server] Craly API running on http://localhost:${config.port}`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
});

export default app;
