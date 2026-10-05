// PM2 process file for the Craly backend on EC2.
//
//   npm ci && npm run build
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup        # restart both on reboot
//
// Two independent processes from the same build:
//   craly-api     Express API (dist/server.js) — queues WhatsApp jobs into Postgres.
//   craly-worker  pg-boss worker (dist/worker.js) — sends them via Meta.
// Restarting or crashing one never affects the other; queued jobs live in
// Postgres, not in either process.
//
// Both read backend/.env (dotenv, via src/config/index.ts) from `cwd`.
module.exports = {
  apps: [
    {
      name: 'craly-api',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1, // Socket.IO's user map is in-process; don't cluster the API without a Socket.IO adapter.
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      kill_timeout: 10000,
      max_memory_restart: '512M',
    },
    {
      name: 'craly-worker',
      script: 'dist/worker.js',
      cwd: __dirname,
      instances: 1, // Scale with WHATSAPP_WORKER_CONCURRENCY first; extra instances are safe (pg-boss uses SKIP LOCKED).
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      // The worker waits up to 30s for in-flight jobs on SIGTERM; give it a
      // little longer before PM2 escalates to SIGKILL.
      kill_timeout: 35000,
      max_memory_restart: '256M',
    },
  ],
};
