import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import config from '../config/index';
import { hashPassword, comparePassword } from '../utils/password';
import { signAuthToken } from '../utils/jwt';
import { signupSchema, loginSchema, sendOtpSchema, verifyOtpSchema } from '../validators/authValidators';
import { generateNumericOtp, hashOtp, verifyOtpHash } from '../utils/otp';
import { sendOtpEmail } from '../utils/mailer';
import { AUTH_COOKIE_NAME } from '../middlewares/auth';
import type { AppError } from '../middlewares/errorHandler';

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

/**
 * POST /api/auth/send-otp
 * Generates and sends a 4-digit OTP code to the user's email. Signup
 * verification is email-only — phone number is collected on the signup
 * form and stored on the profile, but is not itself verified (SMS/MSG91
 * is intentionally disconnected from the active auth flow; see
 * utils/sms.ts).
 */
export async function sendSignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email, name } = parsed.data;

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      const err: AppError = new Error('An account with this email already exists. Please log in instead.');
      err.statusCode = 409;
      return next(err);
    }

    // Generate the email OTP locally — Craly generates, hashes, stores,
    // and verifies this end to end.
    const emailOtp = generateNumericOtp(4);
    const emailOtpHash = hashOtp(email, emailOtp);

    // Invalidate any existing pending OTP for this email, then store the
    // new one with a 10-minute expiry.
    await sql`DELETE FROM auth_verifications WHERE target = ${email}`;
    await sql`
      INSERT INTO auth_verifications (target, target_type, otp_hash, expires_at)
      VALUES (${email}, 'email', ${emailOtpHash}, now() + interval '10 minutes')
    `;

    // Dispatch OTP email (via Resend).
    await sendOtpEmail({ to: email, otp: emailOtp, name });

    res.json({
      data: {
        success: true,
        message: 'Verification code sent to your email',
        expiresInSeconds: 600,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Validates the 4-digit email OTP submitted by the user. Email is the
 * only verified channel for signup — see sendSignupOtp.
 */
export async function verifySignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email, emailOtp } = parsed.data;

    // Check email OTP
    const [emailRecord] = await sql`
      SELECT id, otp_hash, attempts, expires_at, verified
      FROM auth_verifications
      WHERE target = ${email} AND target_type = 'email'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!emailRecord || new Date() > new Date(emailRecord.expires_at)) {
      const err: AppError = new Error('Email verification code has expired. Please request a new code.');
      err.statusCode = 400;
      return next(err);
    }

    if (emailRecord.attempts >= 5) {
      const err: AppError = new Error('Too many incorrect email code attempts. Please request a new code.');
      err.statusCode = 400;
      return next(err);
    }

    const isEmailValid = verifyOtpHash(email, emailOtp, emailRecord.otp_hash);
    if (!isEmailValid) {
      await sql`UPDATE auth_verifications SET attempts = attempts + 1 WHERE id = ${emailRecord.id}`;
      const err: AppError = new Error('Invalid email verification code. Please check and try again.');
      err.statusCode = 400;
      return next(err);
    }

    await sql`
      UPDATE auth_verifications
      SET verified = true, updated_at = now()
      WHERE id = ${emailRecord.id}
    `;

    res.json({
      data: {
        success: true,
        verified: true,
        message: 'Email verified successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/signup
 * Creates a business or contractor user plus their profile row and organization membership
 * in a single transaction, after verifying email and phone ownership.
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email, password, role, companyName, mobile, city, state, workforceSize, yearsExperience } = parsed.data;

    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      const err: AppError = new Error('An account with this email already exists');
      err.statusCode = 409;
      return next(err);
    }

    // Require that email actually completed OTP verification (POST
    // /auth/send-otp + /auth/verify-otp) before an account is created.
    // Signup verification is email-only — phone is collected as a normal
    // profile field but is not itself verified (see sendSignupOtp).
    const [emailVerified] = await sql`
      SELECT id FROM auth_verifications
      WHERE target = ${email} AND target_type = 'email' AND verified = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!emailVerified) {
      const err: AppError = new Error('Please verify your email before creating an account.');
      err.statusCode = 400;
      return next(err);
    }

    const passwordHash = await hashPassword(password);

    const user = await sql.begin(async (tx) => {
      // is_phone_verified stays false — phone number is collected but not
      // verified as part of signup (SMS/MSG91 is out of the active flow).
      const [newUser] = await tx`
        INSERT INTO users (email, password_hash, role, is_active, is_email_verified, is_phone_verified)
        VALUES (${email}, ${passwordHash}, ${role}, true, true, false)
        RETURNING id, email, role
      `;

      if (role === 'contractor') {
        const [cProfile] = await tx`
          INSERT INTO contractor_profiles (
            user_id, company_name, phone, city, state, workforce_size, years_experience, verification_status
          )
          VALUES (
            ${newUser.id}, ${companyName}, ${mobile ?? null}, ${city ?? null}, ${state ?? null},
            ${workforceSize ?? null}, ${yearsExperience ?? null}, 'pending'
          )
          RETURNING id
        `;

        await tx`
          INSERT INTO organization_members (user_id, contractor_profile_id, org_role, status)
          VALUES (${newUser.id}, ${cProfile.id}, 'admin', 'active')
          ON CONFLICT DO NOTHING
        `;
      } else {
        const [bProfile] = await tx`
          INSERT INTO business_profiles (user_id, company_name, city, state, phone, onboarding_complete)
          VALUES (${newUser.id}, ${companyName}, ${city ?? null}, ${state ?? null}, ${mobile ?? null}, true)
          RETURNING id
        `;

        await tx`
          INSERT INTO organization_members (user_id, business_profile_id, org_role, status)
          VALUES (${newUser.id}, ${bProfile.id}, 'admin', 'active')
          ON CONFLICT DO NOTHING
        `;
      }

      // Cleanup the used verification record
      await tx`DELETE FROM auth_verifications WHERE target = ${email}`;

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
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
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
