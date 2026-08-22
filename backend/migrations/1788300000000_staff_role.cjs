/**
 * Migration: Add 'staff' to `users.role` check constraint.
 *
 * Consolidating internal operations under the single 'staff' role
 * as specified in the Staff Basic Flow requirements.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  pgm.sql(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('contractor', 'business', 'admin', 'ops_head', 'field_staff', 'staff'))
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  pgm.sql(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('contractor', 'business', 'admin', 'ops_head', 'field_staff'))
  `);
};
