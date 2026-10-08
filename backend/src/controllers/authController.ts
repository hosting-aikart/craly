import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import config from '../config/index';
import { hashPassword, comparePassword } from '../utils/password';
import { signAuthToken } from '../utils/jwt';
import { signupSchema, loginSchema, sendOtpSchema, verifyOtpSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/authValidators';
import { generateNumericOtp, hashOtp, verifyOtpHash } from '../utils/otp';
import { sendOtpEmail, sendPasswordResetEmail } from '../utils/mailer';
import { notifyContractorWelcome } from '../utils/whatsappNotifications';
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
    try {
      await sendOtpEmail({ to: email, otp: emailOtp, name });
    } catch (mailErr) {
      await sql`DELETE FROM auth_verifications WHERE target = ${email}`;
      const err: AppError = new Error(
        mailErr instanceof Error ? mailErr.message : 'Failed to send verification email'
      );
      err.statusCode = 502;
      return next(err);
    }

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

    let contractorProfileId: string | null = null;
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
        contractorProfileId = cProfile.id;

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

    // Only after the transaction has committed — a failed signup never
    // sends, and a retried signup for the same email is rejected with 409
    // above, so this fires once per account (and the job's idempotency key
    // makes a second enqueue a no-op). Only the job insert is awaited — the
    // send happens in the worker, and a failure is logged, never surfaced.
    if (contractorProfileId) {
      await notifyContractorWelcome({ contractorId: contractorProfileId, userId: user.id, phone: mobile, companyName });
    }

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
  const isProd = config.nodeEnv === 'production';
  const sameSiteValue: 'none' | 'lax' = isProd ? 'none' : 'lax';

  if (isProd) {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      domain: '.craly.co',
    });
  }

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: sameSiteValue,
    path: '/',
  });

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
 * Generates a 6-digit OTP, stores a hashed copy in auth_verifications
 * (reusing the existing table — type = 'password_reset'), and dispatches
 * a reset email. Always returns the same 200 response to prevent user
 * enumeration, even when no account matches the supplied email.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  const GENERIC_OK = { data: { message: 'If an account with that email exists, a reset code has been sent.' } };
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email } = parsed.data;

    const [user] = await sql`SELECT id, email FROM users WHERE email = ${email} AND is_active = true`;
    if (!user) {
      // Return success to prevent user enumeration.
      res.json(GENERIC_OK);
      return;
    }

    // Invalidate any previous password-reset OTP for this email.
    await sql`DELETE FROM auth_verifications WHERE target = ${email} AND target_type = 'password_reset'`;

    // Generate a fresh 6-digit OTP and store only its hash.
    const otp = generateNumericOtp(6);
    const otpHash = hashOtp(email, otp);

    await sql`
      INSERT INTO auth_verifications (target, target_type, otp_hash, expires_at)
      VALUES (${email}, 'password_reset', ${otpHash}, now() + interval '15 minutes')
    `;

    // Send the email — if it throws the transaction is already rolled back,
    // so we clean up and propagate the error.
    try {
      await sendPasswordResetEmail({ to: email, otp });
    } catch (mailErr) {
      // Remove the stored OTP so it can't be used after a delivery failure.
      await sql`DELETE FROM auth_verifications WHERE target = ${email} AND target_type = 'password_reset'`;
      throw mailErr;
    }

    res.json(GENERIC_OK);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Validates the 6-digit OTP generated by forgotPassword, enforces expiry
 * and attempt limits, hashes the new password, and updates the user row.
 * Requires the same `email` used in the forgot-password step so the OTP
 * is tied to a verified identity and can't be replayed against a different
 * account.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email, otp, newPassword } = parsed.data;

    // Fetch the most recent unexpired password-reset verification record.
    const [record] = await sql`
      SELECT id, otp_hash, attempts, expires_at
      FROM auth_verifications
      WHERE target = ${email} AND target_type = 'password_reset'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!record || new Date() > new Date(record.expires_at)) {
      const err: AppError = new Error('Reset code has expired. Please request a new one.');
      err.statusCode = 400;
      return next(err);
    }

    if (record.attempts >= 5) {
      const err: AppError = new Error('Too many incorrect attempts. Please request a new reset code.');
      err.statusCode = 400;
      return next(err);
    }

    const isValid = verifyOtpHash(email, otp, record.otp_hash);
    if (!isValid) {
      await sql`UPDATE auth_verifications SET attempts = attempts + 1 WHERE id = ${record.id}`;
      const err: AppError = new Error('Invalid reset code. Please check and try again.');
      err.statusCode = 400;
      return next(err);
    }

    // OTP is valid — look up the user and update their password.
    const [user] = await sql`SELECT id FROM users WHERE email = ${email} AND is_active = true`;
    if (!user) {
      const err: AppError = new Error('Account not found.');
      err.statusCode = 404;
      return next(err);
    }

    const passwordHash = await hashPassword(newPassword);
    await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = now() WHERE id = ${user.id}`;

    // Invalidate the used verification record so it cannot be replayed.
    await sql`DELETE FROM auth_verifications WHERE target = ${email} AND target_type = 'password_reset'`;

    res.json({ data: { message: 'Password reset successfully. You can now log in with your new password.' } });
  } catch (err) {
    next(err);
  }
}
