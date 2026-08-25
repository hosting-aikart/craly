/**
 * Adds structured city/state columns to manpower_requirements.
 *
 * The table previously only had a single freeform `location` text field
 * (e.g. "Chakan, Pune, Maharashtra"), which made it impossible to apply an
 * exact "contractor.state == requirement.state" matching rule — there was
 * no reliable way to know which part of that free text was the state. This
 * adds real `city`/`state` columns used specifically for opportunity
 * matching; `location` is kept as-is for display purposes and is
 * unaffected.
 *
 * Existing rows are backfilled with a best-effort parse of `location`:
 * the LAST comma-separated segment is treated as the state, and the
 * segment before it as the city (matching the form's own placeholder
 * convention, "Area, City, State"). Rows whose `location` has no comma
 * can't be parsed this way and are left with NULL city/state — the
 * matching logic treats a NULL requirement city/state as "no constraint"
 * so those old rows don't silently become permanently unmatchable.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('manpower_requirements', {
    city: { type: 'text' },
    state: { type: 'text' },
  });

  pgm.sql(`
    UPDATE manpower_requirements
    SET
      state = NULLIF(TRIM(split_part(location, ',', array_length(string_to_array(location, ','), 1))), ''),
      city = CASE
        WHEN array_length(string_to_array(location, ','), 1) >= 2
        THEN NULLIF(TRIM(split_part(location, ',', array_length(string_to_array(location, ','), 1) - 1)), '')
        ELSE NULL
      END
    WHERE city IS NULL AND state IS NULL
  `);

  pgm.createIndex('manpower_requirements', 'state');
  pgm.createIndex('manpower_requirements', 'city');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumns('manpower_requirements', ['city', 'state']);
};
