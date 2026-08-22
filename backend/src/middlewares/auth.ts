import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken, type UserRole } from '../utils/jwt';
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

/**
 * Enforces admin role access. Rejects non-admin users with 403 Forbidden.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      const err: AppError = new Error('Forbidden: Admin access required');
      err.statusCode = 403;
      return next(err);
    }
    next();
  });
}

/**
 * Restricts a route to one or more roles. Must run after requireAuth.
 * Used for the Prima Facie internal-ops split — e.g.
 * requireRole('ops_head') vs requireRole('ops_head', 'field_staff').
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      const err: AppError = new Error('You do not have permission to perform this action');
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
}
