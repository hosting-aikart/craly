/**
 * Add matching fields to contractor_profiles:
 * - industry (text)
 * - skills (text[])
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('contractor_profiles', {
    industry: { type: 'text' },
    skills: { type: 'text[]', default: '{}' },
  });

  // Backfill industry from description if description is populated and industry is NULL
  pgm.sql(`
    UPDATE contractor_profiles 
    SET industry = description 
    WHERE (industry IS NULL OR TRIM(industry) = '') AND description IS NOT NULL AND TRIM(description) != ''
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumns('contractor_profiles', ['industry', 'skills']);
};
