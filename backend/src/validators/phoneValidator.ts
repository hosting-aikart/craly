import { z } from 'zod';

/**
 * Strips formatting characters (spaces, hyphens, parentheses, dots).
 */
export function cleanPhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

/**
 * Validates whether a given raw string represents a legitimate phone number.
 * Supports international E.164 numbers (7-15 digits) and standard Indian 10-digit mobiles.
 */
export function isValidPhoneNumber(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const cleaned = cleanPhone(raw.trim());

  // Must match basic E.164: optional leading '+', followed by 7 to 15 digits
  if (!/^\+?[0-9]{7,15}$/.test(cleaned)) {
    return false;
  }

  const digits = cleaned.replace(/\D/g, '');

  // Reject all identical repeating digits (e.g. 0000000000, 1111111111)
  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  // Country-specific validation for India (+91, 91 prefix, or standard 10 digits):
  // Indian mobile numbers must be 10 digits starting with 5, 6, 7, 8, or 9
  if (cleaned.startsWith('+91') || (cleaned.startsWith('91') && digits.length === 12) || digits.length === 10) {
    const last10 = digits.slice(-10);
    if (!/^[5-9]\d{9}$/.test(last10)) {
      return false;
    }
  }

  return true;
}

/**
 * Zod schema for required phone numbers.
 * Cleans formatting characters and enforces validity.
 */
export const phoneSchema = z
  .string({ message: 'Phone number is required' })
  .trim()
  .min(1, 'Phone number is required')
  .transform(cleanPhone)
  .refine(isValidPhoneNumber, {
    message: 'Please enter a valid phone number (e.g. +91 98765 43210 or 10-digit mobile number)',
  });

/**
 * Zod schema for optional phone numbers.
 * If empty/null/undefined, transforms to undefined. If provided, enforces validity.
 */
export const optionalPhoneSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val) return undefined;
    const trimmed = typeof val === 'string' ? val.trim() : '';
    return trimmed === '' ? undefined : cleanPhone(trimmed);
  })
  .refine(
    (val) => val === undefined || isValidPhoneNumber(val),
    {
      message: 'Please enter a valid phone number (e.g. +91 98765 43210 or 10-digit mobile number)',
    }
  );
