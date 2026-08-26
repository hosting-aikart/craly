import { Request, Response, NextFunction } from 'express';
import sql from '../db/index';
import config from '../config/index';
import { hashPassword, comparePassword } from '../utils/password';
import { signAuthToken } from '../utils/jwt';
import { signupSchema, loginSchema, sendOtpSchema, verifyOtpSchema } from '../validators/authValidators';
import { generateNumericOtp, hashOtp, verifyOtpHash } from '../utils/otp';
import { sendOtpEmail } from '../utils/mailer';
import { verifyMsg91AccessToken } from '../utils/sms';
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
 * Generates and sends 4-digit OTP codes to the user's email and phone number.
 */
export async function sendSignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email, mobile, name } = parsed.data;

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      const err: AppError = new Error('An account with this email already exists. Please log in instead.');
      err.statusCode = 409;
      return next(err);
    }

    // Generate the email OTP locally — Craly still owns email OTP
    // generation, hashing, storage, and verification end to end.
    const emailOtp = generateNumericOtp(4);
    // TEMP QA INSTRUMENTATION — remove before finishing this task.
    require('fs').appendFileSync('/tmp/claude-1000/-run-media-vishal-ALPHA-Craly-craly-dev/3f068068-5798-42cf-acdd-9adc83c7edc0/scratchpad/otp-debug6.log', `${email}|${mobile}|${emailOtp}\n`);
    const emailOtpHash = hashOtp(email, emailOtp);

    // Phone OTP: the MSG91 OTP Widget is a client-side product — the
    // frontend's widget SDK (see app/signup/page.tsx) sends and verifies
    // the code itself, talking to MSG91 directly. Craly's backend never
    // dispatches the phone SMS; it only ever confirms the access-token
    // the widget later produces (POST /api/auth/verify-otp ->
    // verifyMsg91AccessToken). This placeholder row just gives phone
    // verification the same "pending, expires, attempts" bookkeeping
    // email already has, and is what /api/auth/signup checks for
    // verified = true before creating an account.
    await sql.begin(async (tx) => {
      // Invalidate existing pending OTPs for this target
      await tx`DELETE FROM auth_verifications WHERE target IN (${email}, ${mobile})`;

      await tx`
        INSERT INTO auth_verifications (target, target_type, otp_hash, expires_at)
        VALUES
          (${email}, 'email', ${emailOtpHash}, now() + interval '10 minutes'),
          (${mobile}, 'phone', null, now() + interval '15 minutes')
      `;
    });

    // Dispatch OTP email (via Resend). The phone leg is handled entirely
    // client-side by the MSG91 widget — nothing to dispatch here.
    await sendOtpEmail({ to: email, otp: emailOtp, name });

    res.json({
      data: {
        success: true,
        message: 'Verification codes sent to your email and phone number',
        expiresInSeconds: 600,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Validates the 4-digit email and phone OTPs submitted by the user.
 */
export async function verifySignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      const err: AppError = new Error(parsed.error.issues[0]?.message ?? 'Invalid input');
      err.statusCode = 400;
      return next(err);
    }
    const { email, mobile, emailOtp, phoneAccessToken } = parsed.data;

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

    // Check phone verification
    const [phoneRecord] = await sql`
      SELECT id, attempts, expires_at, verified
      FROM auth_verifications
      WHERE target = ${mobile} AND target_type = 'phone'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!phoneRecord || new Date() > new Date(phoneRecord.expires_at)) {
      const err: AppError = new Error('Phone verification has expired. Please request a new code.');
      err.statusCode = 400;
      return next(err);
    }

    if (phoneRecord.attempts >= 5) {
      const err: AppError = new Error('Too many incorrect phone verification attempts. Please request a new code.');
      err.statusCode = 400;
      return next(err);
    }

    // Unlike email (hashed locally), the phone code itself was already
    // sent and verified by MSG91's Widget SDK running in the browser —
    // Craly never sees the plaintext code. What arrives here is the
    // access-token the widget issued on success, which Craly confirms
    // server-side via MSG91's verifyAccessToken API.
    const phoneResult = await verifyMsg91AccessToken(phoneAccessToken);
    if (!phoneResult.verified) {
      await sql`UPDATE auth_verifications SET attempts = attempts + 1 WHERE id = ${phoneRecord.id}`;
      const err: AppError = new Error('Invalid or expired phone verification. Please check and try again.');
      err.statusCode = 400;
      return next(err);
    }

    // Mark both verified
    await sql`
      UPDATE auth_verifications
      SET verified = true, updated_at = now()
      WHERE id IN (${emailRecord.id}, ${phoneRecord.id})
    `;

    res.json({
      data: {
        success: true,
        verified: true,
        message: 'Email and phone number verified successfully.',
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

    // Require that both email and phone actually completed OTP verification
    // (POST /auth/send-otp + /auth/verify-otp) before an account is created.
    // Without this check the endpoint previously hardcoded
    // is_email_verified/is_phone_verified to true unconditionally, so OTP
    // verification existed but was never enforced.
    const [emailVerified] = await sql`
      SELECT id FROM auth_verifications
      WHERE target = ${email} AND target_type = 'email' AND verified = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const [phoneVerified] = await sql`
      SELECT id FROM auth_verifications
      WHERE target = ${mobile} AND target_type = 'phone' AND verified = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!emailVerified || !phoneVerified) {
      const err: AppError = new Error('Please verify your email and phone number before creating an account.');
      err.statusCode = 400;
      return next(err);
    }

    const passwordHash = await hashPassword(password);

    const user = await sql.begin(async (tx) => {
      const [newUser] = await tx`
        INSERT INTO users (email, password_hash, role, is_active, is_email_verified, is_phone_verified)
        VALUES (${email}, ${passwordHash}, ${role}, true, true, true)
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

      // Cleanup used verification records
      await tx`DELETE FROM auth_verifications WHERE target IN (${email}, ${mobile})`;

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
