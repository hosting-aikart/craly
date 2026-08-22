/**
 * Manpower Requirements & Applications schema.
 *
 * Core entities for the BROKERED manpower requirement and application pipeline:
 * - `manpower_requirements`: created and published by Manufacturers (business_profiles).
 * - `applications`: submitted by Contractors (contractor_profiles) to published requirements.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // ── manpower_requirements ───────────────────────────────────────────────
  pgm.createTable('manpower_requirements', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    manufacturer_id: {
      type: 'uuid',
      notNull: true,
      references: 'business_profiles',
      onDelete: 'cascade',
    },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    industry: { type: 'text' },
    location: { type: 'text', notNull: true },
    workers_required: { type: 'integer', notNull: true },
    required_skills: { type: 'text[]', default: '{}' },
    start_date: { type: 'date', notNull: true },
    duration: { type: 'text', notNull: true },
    experience_required: { type: 'integer' },
    budget_min: { type: 'numeric(10, 2)' },
    budget_max: { type: 'numeric(10, 2)' },
    status: {
      type: 'text',
      notNull: true,
      default: 'DRAFT',
      check: "status IN ('DRAFT', 'PUBLISHED', 'APPLICATIONS_OPEN', 'SELECTED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED')",
    },
    published_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    closed_at: { type: 'timestamptz' },
  });

  pgm.createIndex('manpower_requirements', 'manufacturer_id');
  pgm.createIndex('manpower_requirements', 'status');
  pgm.createIndex('manpower_requirements', 'location');

  // ── applications ────────────────────────────────────────────────────────
  pgm.createTable('applications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    requirement_id: {
      type: 'uuid',
      notNull: true,
      references: 'manpower_requirements',
      onDelete: 'cascade',
    },
    contractor_id: {
      type: 'uuid',
      notNull: true,
      references: 'contractor_profiles',
      onDelete: 'cascade',
    },
    proposed_workforce: { type: 'integer', notNull: true },
    availability_date: { type: 'date', notNull: true },
    relevant_experience: { type: 'text' },
    message: { type: 'text' },
    proposed_rate: { type: 'numeric(10, 2)' },
    status: {
      type: 'text',
      notNull: true,
      default: 'SUBMITTED',
      check: "status IN ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'CLOSED')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('applications', 'applications_req_contractor_unique', {
    unique: ['requirement_id', 'contractor_id'],
  });

  pgm.createIndex('applications', 'requirement_id');
  pgm.createIndex('applications', 'contractor_id');
  pgm.createIndex('applications', 'status');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('applications');
  pgm.dropTable('manpower_requirements');
};
