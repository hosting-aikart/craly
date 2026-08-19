import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../utils/jwt';
import type { AppError } from './errorHandler';

/**
 * Restricts a route to one or more roles. Must run after `requireAuth`.
 * Usage: router.post('/contractors/:id/verify', requireAuth, requireRole('admin'), verifyContractor)
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
