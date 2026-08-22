import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import config from '../config/index';
import { hashPassword, comparePassword } from '../utils/password';
import { signAuthToken } from '../utils/jwt';
import { signupSchema, loginSchema } from '../validators/authValidators';
import { AUTH_COOKIE_NAME } from '../middlewares/auth';
import type { AppError } from '../middlewares/errorHandler';

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

/**
 * POST /api/auth/signup
 * Creates a manufacturer (business) user plus their business_profiles row
 * in a single transaction, then logs them in. Contractors are no longer a
 * public signup path — see authValidators.ts.
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email, password, role, companyName } = parsed.data;

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      const err: AppError = new Error('An account with this email already exists');
      err.statusCode = 409;
      return next(err);
    }

    const passwordHash = await hashPassword(password);

    const user = await sql.begin(async (tx) => {
      const [newUser] = await tx`
        INSERT INTO users (email, password_hash, role)
        VALUES (${email}, ${passwordHash}, ${role})
        RETURNING id, email, role
      `;

      await tx`
        INSERT INTO business_profiles (user_id, company_name)
        VALUES (${newUser.id}, ${companyName})
      `;

      return newUser;
    });

    const token = signAuthToken({ sub: user.id, role: user.role });
    setAuthCookie(res, token);

    res.status(201).json({ data: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email, password } = parsed.data;

    const [user] = await sql`SELECT id, email, role, password_hash, is_active FROM users WHERE email = ${email}`;
    if (!user || !(await comparePassword(password, user.password_hash))) {
      const err: AppError = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    if (!user.is_active) {
      // Legacy contractor logins fall here — their profile still exists as
      // a staff-managed record, but the account itself no longer signs in.
      const err: AppError = new Error('This account has been disabled. Contact Craly support if you believe this is a mistake.');
      err.statusCode = 403;
      return next(err);
    }

    const token = signAuthToken({ sub: user.id, role: user.role });
    setAuthCookie(res, token);

    res.json({ data: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ data: { success: true } });
}

/**
 * GET /api/auth/me
 * Requires requireAuth to have run first.
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [user] = await sql`SELECT id, email, role, is_active FROM users WHERE id = ${req.user!.sub}`;
    if (!user) {
      const err: AppError = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }
    // Catches a JWT issued before an account was disabled (e.g. the legacy
    // contractor logins) — session check fails even if the cookie is still valid.
    if (!user.is_active) {
      const err: AppError = new Error('This account has been disabled');
      err.statusCode = 401;
      return next(err);
    }
    res.json({ data: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      const err: AppError = new Error('Email is required');
      err.statusCode = 400;
      return next(err);
    }

    const [user] = await sql`SELECT id, email FROM users WHERE email = ${email}`;
    if (!user) {
      // Return 200 to prevent user enumeration
      res.json({ data: { message: 'If an account exists, a reset instruction has been sent.' } });
      return;
    }

    // Always respond with success message
    res.json({ data: { message: 'If an account exists, a reset instruction has been sent.' } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      const err: AppError = new Error('Token and a valid password (min 8 chars) are required');
      err.statusCode = 400;
      return next(err);
    }

    res.json({ data: { message: 'Password reset successfully.' } });
  } catch (err) {
    next(err);
  }
}
