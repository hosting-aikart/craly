/**
 * Add unlisting support to contractor_profiles:
 * - is_unlisted (boolean, default false, not null)
 * - unlisted_reason (text, nullable)
 * - unlisted_at (timestamptz, nullable)
 * - unlisted_by (uuid, references users(id), nullable)
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('contractor_profiles', {
    is_unlisted: { type: 'boolean', notNull: true, default: false },
    unlisted_reason: { type: 'text' },
    unlisted_at: { type: 'timestamptz' },
    unlisted_by: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('contractor_profiles', ['is_unlisted']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropIndex('contractor_profiles', ['is_unlisted']);
  pgm.dropColumns('contractor_profiles', [
    'is_unlisted',
    'unlisted_reason',
    'unlisted_at',
    'unlisted_by',
  ]);
};
