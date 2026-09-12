/**
 * Contractor Application / Approval workflow — the one piece the existing
 * verification architecture (contractor_profiles.verification_status,
 * contractor_documents, verification_reviews, notifications) didn't already
 * cover: a two-way conversation between a contractor under review and the
 * staff reviewing them.
 *
 * `verification_reviews` already records staff's one-off decision notes,
 * and `notifications` already tells the contractor something changed, but
 * neither lets the contractor reply ("here's why", "I've fixed it, please
 * re-check") or lets staff ask a follow-up without changing the status.
 * This table is the minimum needed to close that gap — purely additive,
 * scoped by `contractor_id` exactly like contractor_documents and
 * verification_reviews already are (contractor_profiles IS the
 * application in this architecture; there is no separate application
 * entity to key off).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('contractor_verification_messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: {
      type: 'uuid',
      notNull: true,
      references: 'contractor_profiles',
      onDelete: 'cascade',
    },
    // Breadcrumb only, like contractor_documents.uploaded_by — the sender's
    // users row may later be deactivated/deleted, so sender_role is
    // denormalized below to keep the thread displayable regardless.
    sender_id: { type: 'uuid', references: 'users', onDelete: 'set null' },
    sender_role: {
      type: 'text',
      notNull: true,
      check: "sender_role IN ('contractor', 'staff', 'admin', 'ops_head', 'field_staff')",
    },
    message: { type: 'text', notNull: true },
    is_read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('contractor_verification_messages', ['contractor_id', 'created_at']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('contractor_verification_messages');
};
