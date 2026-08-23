import crypto from 'crypto';
import config from '../config/index';

const OTP_SALT = config.jwtSecret || 'craly_otp_salt_fallback_2026';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateNumericOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const num = crypto.randomInt(min, max + 1);
  return num.toString();
}

/**
 * Computes a SHA-256 hash of the OTP combined with a target and server salt.
 */
export function hashOtp(target: string, otp: string): string {
  const normalizedTarget = target.trim().toLowerCase();
  return crypto
    .createHmac('sha256', OTP_SALT)
    .update(`${normalizedTarget}:${otp}`)
    .digest('hex');
}

/**
 * Verifies an OTP against a stored hash.
 */
export function verifyOtpHash(target: string, otp: string, storedHash: string): boolean {
  const computed = hashOtp(target, otp);
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
}
