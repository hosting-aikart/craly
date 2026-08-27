/**
 * Migration: adds `provider_ref` to auth_verifications and relaxes
 * `otp_hash` to nullable.
 *
 * Phone OTPs now go through MSG91's OTP Widget (see utils/sms.ts), which
 * generates and verifies the 4-digit code on MSG91's own servers — Craly
 * never sees the plaintext code for phone, so there is nothing to hash and
 * store locally the way email OTPs still are. Instead, Craly stores the
 * opaque `reqId` MSG91's sendOtp call returns (not secret — it's a request
 * handle, not a code) in `provider_ref`, and passes it back to MSG91's
 * verifyOtp call alongside the user-submitted code.
 *
 * After this migration: email rows have `otp_hash` set and `provider_ref`
 * null (unchanged, Craly-owned hash verification); phone rows have
 * `otp_hash` null and `provider_ref` set (MSG91-owned verification).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumn('auth_verifications', {
    provider_ref: { type: 'text' },
  });
  pgm.alterColumn('auth_verifications', 'otp_hash', { notNull: false });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.alterColumn('auth_verifications', 'otp_hash', { notNull: true });
  pgm.dropColumn('auth_verifications', 'provider_ref');
};
