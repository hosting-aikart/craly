/**
 * Initial schema for Craly: users/auth, contractor profiles + verification
 * documents, business profiles, service categories, and inquiries (the
 * "reach out" record between a business and a contractor).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
  pgm.createExtension('citext', { ifNotExists: true });

  // ── users ──────────────────────────────────────────────────────────────
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'citext', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    role: { type: 'text', notNull: true, check: "role IN ('contractor', 'business', 'admin')" },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ── service_categories (lookup) ───────────────────────────────────────
  pgm.createTable('service_categories', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true, unique: true },
    slug: { type: 'text', notNull: true, unique: true },
  });

  // ── contractor_profiles ───────────────────────────────────────────────
  pgm.createTable('contractor_profiles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users',
      onDelete: 'cascade',
    },
    company_name: { type: 'text', notNull: true },
    description: { type: 'text' },
    city: { type: 'text' },
    state: { type: 'text' },
    years_experience: { type: 'integer' },
    workforce_size: { type: 'integer' },
    verification_status: {
      type: 'text',
      notNull: true,
      default: 'pending',
      check: "verification_status IN ('pending', 'verified', 'rejected')",
    },
    verification_note: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('contractor_profiles', ['city', 'verification_status']);
  pgm.createIndex('contractor_profiles', 'company_name');

  // ── contractor_categories (join) ──────────────────────────────────────
  pgm.createTable('contractor_categories', {
    contractor_id: {
      type: 'uuid',
      notNull: true,
      references: 'contractor_profiles',
      onDelete: 'cascade',
    },
    category_id: {
      type: 'integer',
      notNull: true,
      references: 'service_categories',
      onDelete: 'cascade',
    },
  });
  pgm.addConstraint('contractor_categories', 'contractor_categories_pkey', {
    primaryKey: ['contractor_id', 'category_id'],
  });
  pgm.createIndex('contractor_categories', 'category_id');

  // ── contractor_documents (verification evidence) ──────────────────────
  pgm.createTable('contractor_documents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: {
      type: 'uuid',
      notNull: true,
      references: 'contractor_profiles',
      onDelete: 'cascade',
    },
    doc_type: { type: 'text', notNull: true },
    file_url: { type: 'text', notNull: true },
    status: {
      type: 'text',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'approved', 'rejected')",
    },
    uploaded_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('contractor_documents', 'contractor_id');

  // ── business_profiles ─────────────────────────────────────────────────
  pgm.createTable('business_profiles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users',
      onDelete: 'cascade',
    },
    company_name: { type: 'text', notNull: true },
    industry: { type: 'text' },
    city: { type: 'text' },
    state: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ── inquiries ("reach out" records) ───────────────────────────────────
  pgm.createTable('inquiries', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    business_id: {
      type: 'uuid',
      notNull: true,
      references: 'business_profiles',
      onDelete: 'cascade',
    },
    contractor_id: {
      type: 'uuid',
      notNull: true,
      references: 'contractor_profiles',
      onDelete: 'cascade',
    },
    message: { type: 'text', notNull: true },
    contact_phone: { type: 'text' },
    status: {
      type: 'text',
      notNull: true,
      default: 'new',
      check: "status IN ('new', 'seen', 'closed')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('inquiries', 'contractor_id');
  pgm.createIndex('inquiries', 'business_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('inquiries');
  pgm.dropTable('business_profiles');
  pgm.dropTable('contractor_documents');
  pgm.dropTable('contractor_categories');
  pgm.dropTable('contractor_profiles');
  pgm.dropTable('service_categories');
  pgm.dropTable('users');
};
