/**
 * Business → Contractor enquiry, conversation, and notification system.
 *
 * `inquiries` already existed (from the initial schema) as a bare "reach
 * out" record — this extends it with the structured requirement fields the
 * enquiry form actually collects, and moves its status enum from the old
 * placeholder values ('new'/'seen'/'closed') to the real workflow states.
 * `inquiry_messages` and `notifications` are net new.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // ── inquiries: add structured requirement fields ─────────────────────
  pgm.addColumns('inquiries', {
    category_id: {
      type: 'integer',
      references: 'service_categories',
      onDelete: 'set null',
    },
    location: { type: 'text' },
    workers_required: { type: 'integer' },
    start_date: { type: 'date' },
    duration: { type: 'text' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Replace the placeholder status enum with the real workflow states.
  // No code has ever written to this table, so a direct rewrite is safe.
  pgm.sql("ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check");
  pgm.sql("UPDATE inquiries SET status = 'new'");
  pgm.addConstraint('inquiries', 'inquiries_status_check', {
    check: "status IN ('new', 'viewed', 'responded', 'in_discussion', 'closed')",
  });
  pgm.createIndex('inquiries', 'status');
  pgm.createIndex('inquiries', 'created_at');

  // ── inquiry_messages ──────────────────────────────────────────────────
  pgm.createTable('inquiry_messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    inquiry_id: {
      type: 'uuid',
      notNull: true,
      references: 'inquiries',
      onDelete: 'cascade',
    },
    sender_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'cascade',
    },
    receiver_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'cascade',
    },
    message: { type: 'text', notNull: true },
    is_read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('inquiry_messages', 'inquiry_id');
  pgm.createIndex('inquiry_messages', ['receiver_id', 'is_read']);

  // ── notifications ─────────────────────────────────────────────────────
  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'cascade',
    },
    // Kept as free text (not a DB enum) so future stages — quotations,
    // contracts, etc. — can introduce new notification types without a
    // migration; the enquiry system is the only writer today.
    type: { type: 'text', notNull: true },
    title: { type: 'text', notNull: true },
    message: { type: 'text', notNull: true },
    reference_id: { type: 'uuid' },
    is_read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('notifications', ['user_id', 'created_at']);
  pgm.createIndex('notifications', ['user_id', 'is_read']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('notifications');
  pgm.dropTable('inquiry_messages');

  pgm.dropIndex('inquiries', 'created_at');
  pgm.dropIndex('inquiries', 'status');
  pgm.dropConstraint('inquiries', 'inquiries_status_check');
  pgm.sql("UPDATE inquiries SET status = 'new'");
  pgm.addConstraint('inquiries', 'inquiries_status_check', {
    check: "status IN ('new', 'seen', 'closed')",
  });

  pgm.dropColumns('inquiries', [
    'category_id',
    'location',
    'workers_required',
    'start_date',
    'duration',
    'updated_at',
  ]);
};
