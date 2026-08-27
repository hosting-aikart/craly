/**
 * Contractor architecture reconciliation.
 *
 * Retires the `pf_contractors` fork (zero consumers, zero rows) in favor of
 * evolving `contractor_profiles` in place — every other system (enquiries,
 * messages, meetings, sockets, both admin controllers, the public
 * directory) already keys off it, so adapting it is the actual "cleanest
 * final architecture" rather than maintaining a second contractor identity.
 *
 * Also settles `inquiries.status`, which had been silently redefined twice
 * across two prior migrations, onto one final lifecycle.
 *
 * The 4 existing contractor accounts are NOT deleted. Their login is
 * disabled (`users.is_active = false`) and their `contractor_profiles.user_id`
 * is detached (copied to `legacy_user_id` first, then nulled) — converting
 * them into staff-managed records, per the reconciliation plan.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // ── users: account-disable flag (generic, not contractor-specific) ────
  pgm.addColumns('users', {
    is_active: { type: 'boolean', notNull: true, default: true },
  });

  // ── contractor_profiles: detach from auth, add Prima Facie fields ─────
  pgm.sql('ALTER TABLE contractor_profiles ALTER COLUMN user_id DROP NOT NULL');

  pgm.addColumns('contractor_profiles', {
    // Breadcrumb only — the `users` row isn't deleted, so no FK needed here.
    legacy_user_id: { type: 'uuid' },

    availability: {
      type: 'text',
      notNull: true,
      default: 'AVAILABLE',
      check: "availability IN ('AVAILABLE', 'CURRENTLY_AT_CAPACITY', 'NOT_AVAILABLE', 'PAUSED', 'SUSPENDED')",
    },
    availability_note: { type: 'text' },
    service_areas: { type: 'text[]' },
    overseas_interest: { type: 'boolean', notNull: true, default: false },
    ghosting_count: { type: 'integer', notNull: true, default: 0 },
    repeat_engagement_count: { type: 'integer', notNull: true, default: 0 },

    certification_status: {
      type: 'text',
      notNull: true,
      default: 'none',
      check: "certification_status IN ('none', 'pending', 'certified')",
    },
    certified_at: { type: 'timestamptz' },
    certified_expires_at: { type: 'timestamptz' },
    overall_rating: { type: 'numeric(3,2)' },

    created_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
  });

  // Convert the 4 existing (self-signup) contractor records into
  // staff-managed ones: detach the login, keep the old id as a breadcrumb.
  pgm.sql(`
    UPDATE contractor_profiles
    SET legacy_user_id = user_id, user_id = NULL
    WHERE user_id IS NOT NULL
  `);
  pgm.sql(`
    UPDATE users SET is_active = false WHERE role = 'contractor'
  `);

  // ── inquiries: one final status lifecycle ──────────────────────────────
  pgm.sql('ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check');
  pgm.sql("UPDATE inquiries SET status = 'NEW' WHERE status = 'PENDING'");
  pgm.sql("UPDATE inquiries SET status = 'IN_PROGRESS' WHERE status = 'ACCEPTED'");
  pgm.addConstraint('inquiries', 'inquiries_status_check', {
    check: "status IN ('NEW', 'UNDER_REVIEW', 'BROKERING', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'WON', 'LOST', 'CLOSED_EXPIRED', 'DECLINED')",
  });
  pgm.renameColumn('inquiries', 'decline_reason', 'status_reason');

  // ── retire the pf_* fork (zero consumers, zero rows) ───────────────────
  pgm.dropTable('pf_contractor_certificates');
  pgm.dropTable('pf_contractor_documents');
  pgm.dropTable('pf_contractor_categories');
  pgm.dropTable('pf_contractors');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  // Recreate the pf_* tables (empty — no data existed to restore).
  pgm.createTable('pf_contractors', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    full_name: { type: 'text', notNull: true },
    company_name: { type: 'text' },
    phone: { type: 'text' },
    city: { type: 'text' },
    service_areas: { type: 'text[]' },
    years_in_business: { type: 'integer' },
    workforce_count: { type: 'integer' },
    overseas_interest: { type: 'boolean', notNull: true, default: false },
    availability: { type: 'text', notNull: true, default: 'AVAILABLE' },
    availability_note: { type: 'text' },
    verification_status: { type: 'text', notNull: true, default: 'unverified' },
    last_verified_at: { type: 'timestamptz' },
    certification_status: { type: 'text', notNull: true, default: 'none' },
    certified_at: { type: 'timestamptz' },
    certified_expires_at: { type: 'timestamptz' },
    ghosting_count: { type: 'integer', notNull: true, default: 0 },
    repeat_engagement_count: { type: 'integer', notNull: true, default: 0 },
    overall_rating: { type: 'numeric(3,2)' },
    photo_url: { type: 'text' },
    description: { type: 'text' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createTable('pf_contractor_categories', {
    contractor_id: { type: 'uuid', notNull: true, references: 'pf_contractors', onDelete: 'cascade' },
    category_id: { type: 'integer', notNull: true, references: 'service_categories', onDelete: 'cascade' },
  });
  pgm.addConstraint('pf_contractor_categories', 'pf_contractor_categories_pkey', {
    primaryKey: ['contractor_id', 'category_id'],
  });
  pgm.createTable('pf_contractor_documents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: { type: 'uuid', notNull: true, references: 'pf_contractors', onDelete: 'cascade' },
    document_type: { type: 'text', notNull: true },
    storage_key: { type: 'text', notNull: true },
    uploaded_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createTable('pf_contractor_certificates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: { type: 'uuid', notNull: true, references: 'pf_contractors', onDelete: 'cascade' },
    certificate_type: { type: 'text', notNull: true },
    industry: { type: 'text' },
    document_storage_key: { type: 'text' },
    issue_date: { type: 'date' },
    expiry_date: { type: 'date' },
    status: { type: 'text', notNull: true, default: 'active' },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // inquiries: reverse the status remap (lossy for IN_PROGRESS sub-states —
  // there's no way to tell what it was before the merge) and rename back.
  pgm.renameColumn('inquiries', 'status_reason', 'decline_reason');
  pgm.sql('ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check');
  pgm.sql("UPDATE inquiries SET status = 'ACCEPTED' WHERE status = 'IN_PROGRESS'");
  pgm.sql("UPDATE inquiries SET status = 'PENDING' WHERE status = 'NEW'");
  pgm.sql("UPDATE inquiries SET status = 'CLOSED' WHERE status IN ('UNDER_REVIEW', 'BROKERING', 'CONTACTED', 'COMPLETED', 'WON', 'LOST', 'CLOSED_EXPIRED')");
  pgm.addConstraint('inquiries', 'inquiries_status_check', {
    check: "status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CLOSED')",
  });

  // contractor_profiles: restore the login link and drop the new columns.
  pgm.sql('UPDATE contractor_profiles SET user_id = legacy_user_id WHERE legacy_user_id IS NOT NULL');
  pgm.sql("UPDATE users SET is_active = true WHERE role = 'contractor'");
  pgm.dropColumns('contractor_profiles', [
    'legacy_user_id', 'availability', 'availability_note', 'service_areas',
    'overseas_interest', 'ghosting_count', 'repeat_engagement_count',
    'certification_status', 'certified_at', 'certified_expires_at',
    'overall_rating', 'created_by',
  ]);
  pgm.sql('ALTER TABLE contractor_profiles ALTER COLUMN user_id SET NOT NULL');

  pgm.dropColumn('users', 'is_active');
};
