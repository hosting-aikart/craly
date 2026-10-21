/**
 * Migration: contractor_class
 * Adds contractor_class column to contractor_profiles with check constraint for allowed classes:
 * 'Class I', 'Class II', 'Class III', 'Class IV'.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('contractor_profiles', {
    contractor_class: {
      type: 'text',
      notNull: false,
      check: "contractor_class IN ('Class I', 'Class II', 'Class III', 'Class IV')",
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumns('contractor_profiles', ['contractor_class']);
};
