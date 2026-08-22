/**
 * Public "List Your Company" contractor lead intake — the missing first
 * step before a contractor becomes a real contractor_profiles record.
 *
 * This is deliberately a separate table from contractor_profiles: it holds
 * raw lead data (contact person, free-text skills, a message) and its own
 * onboarding-request lifecycle, not contractor profile data. It is NOT a
 * revival of pf_contractors — that table held actual profile fields and
 * was retired during the contractor-architecture reconciliation because it
 * had zero consumers; this one is a staging queue that feeds INTO
 * contractor_profiles once Field Staff act on it.
 *
 * Three independent status vocabularies now exist by design, and must stay
 * independent:
 *   - contractor_onboarding_requests.status  (this migration)
 *   - contractor_profiles.verification_status (existing)
 *   - inquiries.status                        (existing, settled during reconciliation)
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('contractor_onboarding_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },

    company_name: { type: 'text', notNull: true },
    contact_person: { type: 'text', notNull: true },
    phone: { type: 'text', notNull: true },
    email: { type: 'text' },
    city: { type: 'text', notNull: true },
    industry: { type: 'text', notNull: true },
    workforce_count: { type: 'integer' },
    skills: { type: 'text' },
    years_experience: { type: 'integer' },
    message: { type: 'text' },

    status: {
      type: 'text',
      notNull: true,
      default: 'NEW',
      check: "status IN ('NEW', 'CONTACTED', 'PROFILE_IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED')",
    },
    staff_notes: { type: 'text' },

    // Set once Field Staff clicks "Start Profile" — links the lead to the
    // real record it became. Nullable: most of a request's life it's null.
    contractor_profile_id: { type: 'uuid', references: 'contractor_profiles', onDelete: 'set null' },
    assigned_to: { type: 'uuid', references: 'users', onDelete: 'set null' },

    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('contractor_onboarding_requests', 'status');
  pgm.createIndex('contractor_onboarding_requests', 'created_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('contractor_onboarding_requests');
};
