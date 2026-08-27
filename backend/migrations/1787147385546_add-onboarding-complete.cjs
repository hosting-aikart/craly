/**
 * Adds an explicit "has this profile been through onboarding" flag to both
 * profile tables, so the frontend can decide login → onboarding vs.
 * login → dashboard without guessing from which fields happen to be null.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumn('contractor_profiles', {
    onboarding_complete: { type: 'boolean', notNull: true, default: false },
  });
  pgm.addColumn('business_profiles', {
    onboarding_complete: { type: 'boolean', notNull: true, default: false },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumn('contractor_profiles', 'onboarding_complete');
  pgm.dropColumn('business_profiles', 'onboarding_complete');
};
