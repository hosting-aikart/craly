/**
 * Phase 1 — Contractor Verification & Trust: documents, certificates, and
 * the richer verification/certification lifecycle.
 *
 * Purely additive to the reconciled contractor_profiles architecture.
 * `contractor_documents` is reshaped in place (zero consumers exist in code
 * today — it was defined in the initial schema and never queried), rather
 * than standing up a second document table. `verification_reviews` and
 * `audit_logs` (from admin_workspace_tables) are reused as-is.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // ── contractor_documents: reshape for private R2 storage ──────────────
  pgm.renameColumn('contractor_documents', 'doc_type', 'document_type');
  pgm.renameColumn('contractor_documents', 'uploaded_at', 'created_at');

  pgm.addColumns('contractor_documents', {
    // The R2 object key — never client-influenced (see utils/r2.ts). Added
    // nullable first since existing rows (if any) have no R2 object yet;
    // tightened to NOT NULL once backfilled below.
    storage_key: { type: 'text' },
    file_name: { type: 'text' },
    mime_type: { type: 'text' },
    size_bytes: { type: 'integer' },
    uploaded_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
    issue_date: { type: 'date' },
    expiry_date: { type: 'date' },
    // Structured extras (e.g. GPS coordinates for evidence photos) —
    // deliberately schemaless so new evidence types don't need a migration.
    metadata: { type: 'jsonb', notNull: true, default: '{}' },
    // Links a verification_evidence document to the certification
    // assessment it was captured for. FK added after that table exists.
    certification_assessment_id: { type: 'uuid' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // No rows exist against the old file_url shape in practice (zero
  // consumers ever wrote one), but guard anyway before enforcing NOT NULL.
  pgm.sql(`
    UPDATE contractor_documents
    SET storage_key = COALESCE(storage_key, 'legacy/' || id::text),
        file_name = COALESCE(file_name, 'document'),
        mime_type = COALESCE(mime_type, 'application/octet-stream'),
        size_bytes = COALESCE(size_bytes, 0)
    WHERE storage_key IS NULL
  `);
  pgm.sql('ALTER TABLE contractor_documents ALTER COLUMN storage_key SET NOT NULL');
  pgm.sql('ALTER TABLE contractor_documents ALTER COLUMN file_name SET NOT NULL');
  pgm.sql('ALTER TABLE contractor_documents ALTER COLUMN mime_type SET NOT NULL');
  pgm.sql('ALTER TABLE contractor_documents ALTER COLUMN size_bytes SET NOT NULL');

  pgm.dropColumns('contractor_documents', ['file_url']);

  pgm.sql('ALTER TABLE contractor_documents DROP CONSTRAINT IF EXISTS contractor_documents_status_check');
  pgm.addConstraint('contractor_documents', 'contractor_documents_status_check', {
    check: "status IN ('pending', 'approved', 'rejected', 'replacement_requested')",
  });

  pgm.createIndex('contractor_documents', ['contractor_id', 'document_type']);

  // ── contractor_profiles: richer verification lifecycle ────────────────
  pgm.sql('ALTER TABLE contractor_profiles DROP CONSTRAINT IF EXISTS contractor_profiles_verification_status_check');
  pgm.addConstraint('contractor_profiles', 'contractor_profiles_verification_status_check', {
    check: "verification_status IN ('pending', 'under_review', 'verified', 'rejected', 'needs_changes')",
  });

  pgm.addColumns('contractor_profiles', {
    last_verified_at: { type: 'timestamptz' },
    next_verification_due_at: { type: 'timestamptz' },
  });

  // ── contractor_certification_assessments: Prima Facie assessment history ──
  pgm.createTable('contractor_certification_assessments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: { type: 'uuid', notNull: true, references: 'contractor_profiles', onDelete: 'cascade' },
    assessment_type: { type: 'text', notNull: true, check: "assessment_type IN ('in_person', 'remote')" },
    assessor_id: { type: 'uuid', references: 'users', onDelete: 'set null' },
    assessment_date: { type: 'date', notNull: true },
    decision: { type: 'text', notNull: true, check: "decision IN ('approved', 'rejected')" },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('contractor_certification_assessments', 'contractor_id');

  pgm.addConstraint('contractor_documents', 'contractor_documents_certification_assessment_fkey', {
    foreignKeys: {
      columns: 'certification_assessment_id',
      references: 'contractor_certification_assessments(id)',
      onDelete: 'SET NULL',
    },
  });

  // ── contractor_certificates: generic license/certificate model ────────
  pgm.createTable('contractor_certificates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: { type: 'uuid', notNull: true, references: 'contractor_profiles', onDelete: 'cascade' },
    certificate_type: { type: 'text', notNull: true },
    industry: { type: 'text' },
    document_id: { type: 'uuid', references: 'contractor_documents', onDelete: 'set null' },
    issue_date: { type: 'date' },
    expiry_date: { type: 'date' },
    status: { type: 'text', notNull: true, default: 'active', check: "status IN ('active', 'expired', 'revoked')" },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('contractor_certificates', ['contractor_id', 'expiry_date']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('contractor_certificates');

  pgm.dropConstraint('contractor_documents', 'contractor_documents_certification_assessment_fkey');
  pgm.dropTable('contractor_certification_assessments');

  pgm.dropColumns('contractor_profiles', ['last_verified_at', 'next_verification_due_at']);
  pgm.sql('ALTER TABLE contractor_profiles DROP CONSTRAINT IF EXISTS contractor_profiles_verification_status_check');
  pgm.sql(`
    UPDATE contractor_profiles SET verification_status = 'pending'
    WHERE verification_status IN ('under_review', 'needs_changes')
  `);
  pgm.addConstraint('contractor_profiles', 'contractor_profiles_verification_status_check', {
    check: "verification_status IN ('pending', 'verified', 'rejected')",
  });

  pgm.dropIndex('contractor_documents', ['contractor_id', 'document_type']);
  pgm.sql('ALTER TABLE contractor_documents DROP CONSTRAINT IF EXISTS contractor_documents_status_check');
  pgm.sql("UPDATE contractor_documents SET status = 'pending' WHERE status = 'replacement_requested'");
  pgm.addConstraint('contractor_documents', 'contractor_documents_status_check', {
    check: "status IN ('pending', 'approved', 'rejected')",
  });

  pgm.addColumns('contractor_documents', {
    file_url: { type: 'text' },
  });
  pgm.sql("UPDATE contractor_documents SET file_url = 'legacy://' || storage_key");
  pgm.sql('ALTER TABLE contractor_documents ALTER COLUMN file_url SET NOT NULL');

  pgm.dropColumns('contractor_documents', [
    'storage_key', 'file_name', 'mime_type', 'size_bytes', 'uploaded_by',
    'issue_date', 'expiry_date', 'metadata', 'certification_assessment_id', 'updated_at',
  ]);

  pgm.renameColumn('contractor_documents', 'created_at', 'uploaded_at');
  pgm.renameColumn('contractor_documents', 'document_type', 'doc_type');
};
