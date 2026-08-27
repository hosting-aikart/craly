/**
 * Migration: Creates auth_verifications table for OTP verification (Email and Phone),
 * and adds verification status columns to users table.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('auth_verifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    target: { type: 'text', notNull: true },
    target_type: { type: 'text', notNull: true, check: "target_type IN ('email', 'phone')" },
    otp_hash: { type: 'text', notNull: true },
    verified: { type: 'boolean', notNull: true, default: false },
    attempts: { type: 'integer', notNull: true, default: 0 },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('auth_verifications', ['target', 'target_type', 'verified', 'expires_at']);

  pgm.addColumns('users', {
    is_email_verified: { type: 'boolean', notNull: true, default: false },
    is_phone_verified: { type: 'boolean', notNull: true, default: false },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumns('users', ['is_email_verified', 'is_phone_verified']);
  pgm.dropTable('auth_verifications');
};
