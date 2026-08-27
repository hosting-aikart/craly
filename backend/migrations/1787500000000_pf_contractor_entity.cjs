/**
 * Prima Facie foundation — internal ops roles + the contractor-as-entity
 * model (§3, §6, §31/64 of the scope doc: contractors have no platform
 * login; only Operations Head / Field Intelligence Staff create and manage
 * their records).
 *
 * Deliberately additive, not destructive: `users.role` keeps its existing
 * 'contractor'/'business'/'admin' values (the self-service contractor/
 * business login flow elsewhere in the app still depends on them) and this
 * migration only adds 'ops_head'/'field_staff' alongside them. Likewise
 * `pf_contractors` is a new table, independent of the existing
 * `contractor_profiles` (which stays as-is for now) — it becomes the
 * canonical contractor record once the self-service login is retired.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // ── users.role: add the two internal staff roles ──────────────────────
  pgm.sql('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  pgm.sql(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('contractor', 'business', 'admin', 'ops_head', 'field_staff'))
  `);

  // ── pf_contractors: the internally-managed contractor record ──────────
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

    availability: {
      type: 'text',
      notNull: true,
      default: 'AVAILABLE',
      check: "availability IN ('AVAILABLE', 'CURRENTLY_AT_CAPACITY', 'NOT_AVAILABLE', 'PAUSED', 'SUSPENDED')",
    },
    // Set only from the contractor's own communication to staff (§18/§63) —
    // never flipped automatically by inquiry activity.
    availability_note: { type: 'text' },

    verification_status: {
      type: 'text',
      notNull: true,
      default: 'unverified',
      check: "verification_status IN ('unverified', 'pending', 'verified')",
    },
    last_verified_at: { type: 'timestamptz' },

    certification_status: {
      type: 'text',
      notNull: true,
      default: 'none',
      check: "certification_status IN ('none', 'pending', 'certified')",
    },
    certified_at: { type: 'timestamptz' },
    certified_expires_at: { type: 'timestamptz' },

    ghosting_count: { type: 'integer', notNull: true, default: 0 },
    repeat_engagement_count: { type: 'integer', notNull: true, default: 0 },
    overall_rating: { type: 'numeric(3,2)' },

    photo_url: { type: 'text' },
    description: { type: 'text' },

    // Which staff member entered this record — for the field-agent
    // accountability requirement (§49).
    created_by: { type: 'uuid', references: 'users', onDelete: 'set null' },

    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('pf_contractors', 'verification_status');
  pgm.createIndex('pf_contractors', 'availability');
  pgm.createIndex('pf_contractors', 'city');

  // ── pf_contractor_categories: reuses the existing service_categories lookup ──
  pgm.createTable('pf_contractor_categories', {
    contractor_id: { type: 'uuid', notNull: true, references: 'pf_contractors', onDelete: 'cascade' },
    category_id: { type: 'integer', notNull: true, references: 'service_categories', onDelete: 'cascade' },
  });
  pgm.addConstraint('pf_contractor_categories', 'pf_contractor_categories_pkey', {
    primaryKey: ['contractor_id', 'category_id'],
  });
  pgm.createIndex('pf_contractor_categories', 'category_id');

  // ── pf_contractor_documents: Aadhaar/PAN metadata — never public (§8) ──
  // `storage_key` is an opaque reference; the actual encrypted file store
  // is an external-integration decision still pending (see docs/integrations.md).
  pgm.createTable('pf_contractor_documents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: { type: 'uuid', notNull: true, references: 'pf_contractors', onDelete: 'cascade' },
    document_type: { type: 'text', notNull: true, check: "document_type IN ('aadhaar', 'pan', 'other')" },
    storage_key: { type: 'text', notNull: true },
    uploaded_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('pf_contractor_documents', 'contractor_id');

  // ── pf_contractor_certificates: generic license/certificate model (§14/§17) ──
  pgm.createTable('pf_contractor_certificates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: { type: 'uuid', notNull: true, references: 'pf_contractors', onDelete: 'cascade' },
    certificate_type: { type: 'text', notNull: true },
    industry: { type: 'text' },
    document_storage_key: { type: 'text' },
    issue_date: { type: 'date' },
    expiry_date: { type: 'date' },
    status: { type: 'text', notNull: true, default: 'active', check: "status IN ('active', 'expired', 'revoked')" },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('pf_contractor_certificates', 'contractor_id');
  pgm.createIndex('pf_contractor_certificates', 'expiry_date');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('pf_contractor_certificates');
  pgm.dropTable('pf_contractor_documents');
  pgm.dropTable('pf_contractor_categories');
  pgm.dropTable('pf_contractors');

  pgm.sql('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  pgm.sql(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('contractor', 'business', 'admin'))
  `);
};
