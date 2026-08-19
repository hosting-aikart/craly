import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../utils/jwt';
import type { AppError } from './errorHandler';

const COOKIE_NAME = 'craly_token';
export const AUTH_COOKIE_NAME = COOKIE_NAME;

/**
 * Verifies the JWT from the `craly_token` cookie (falls back to an
 * `Authorization: Bearer <token>` header) and attaches the decoded payload
 * to `req.user`. Rejects with 401 if missing/invalid.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = req.cookies?.[COOKIE_NAME] ?? bearer;

  if (!token) {
    const err: AppError = new Error('Authentication required');
    err.statusCode = 401;
    return next(err);
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    const err: AppError = new Error('Invalid or expired session');
    err.statusCode = 401;
    next(err);
  }
}
