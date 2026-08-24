/**
 * staffController.ts's updateEngagementStatus has accepted
 * CONTACTING / IN_DISCUSSION / CONFIRMED since it was built, but
 * applications.status's CHECK constraint was never widened to allow them —
 * every attempt to progress a Staff coordination engagement past SELECTED
 * has been failing at the database with a constraint violation. Discovered
 * by actually running the flow end-to-end, not by reading the code.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.dropConstraint('applications', 'applications_status_check');
  pgm.addConstraint('applications', 'applications_status_check', {
    check: "status IN ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'CONTACTING', 'IN_DISCUSSION', 'CONFIRMED', 'REJECTED', 'CLOSED')",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('applications', 'applications_status_check');
  pgm.addConstraint('applications', 'applications_status_check', {
    check: "status IN ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'CLOSED')",
  });
};
