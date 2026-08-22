/**
 * Field Intelligence Staff need somewhere to record internal, non-public
 * observations while collecting a contractor's data (e.g. "gate visit,
 * owner unavailable, call back after 3pm") — distinct from `description`,
 * which is the contractor's own public-facing blurb shown in the directory.
 *
 * Every other Field Staff Phase 1 profile field (industry via categories,
 * skill categories, worker count, service areas, years in business,
 * overseas interest, phone, availability/capacity) already exists on
 * `contractor_profiles` — this is the one genuinely missing column.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('contractor_profiles', {
    notes: { type: 'text' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumn('contractor_profiles', 'notes');
};
