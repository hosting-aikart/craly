import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Centralized error handler middleware.
 * Must be registered LAST (after all routes) in server.ts.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'Internal Server Error';

  console.error(`[error] ${statusCode} — ${message}`, err.stack);

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
