import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

const GENERIC_MESSAGE = 'Something went wrong on our end. Please try again in a moment.';

/**
 * Centralized error handler middleware.
 * Must be registered LAST (after all routes) in server.ts.
 *
 * Every deliberately-thrown business error in this app sets `statusCode`
 * explicitly (400/401/403/404/409/...) and carries a hand-written,
 * user-facing message ("Invalid email or password", "Requirement not
 * found", ...) — those are shown to the client exactly as written.
 *
 * An error with NO `statusCode` is an *unexpected* failure — most often a
 * raw database/driver error (a Postgres type-mismatch, a constraint
 * violation, a connection drop) or an uncaught bug. Those messages are
 * internal implementation detail ("CASE types text[] and text cannot be
 * matched" tells a user nothing useful and looks broken/scary), so they're
 * replaced with one generic, friendly message instead of leaking straight
 * through. The real message and stack are always logged server-side, and
 * still returned in the response in development only, for debugging.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const isUnexpected = err.statusCode === undefined;
  const clientMessage = isUnexpected ? GENERIC_MESSAGE : (err.message || GENERIC_MESSAGE);

  console.error(`[error] ${statusCode} — ${err.message}`, err.stack);

  res.status(statusCode).json({
    error: {
      message: clientMessage,
      ...(process.env.NODE_ENV === 'development' && isUnexpected && { rawMessage: err.message }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
