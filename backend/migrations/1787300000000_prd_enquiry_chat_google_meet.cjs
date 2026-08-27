/**
 * PRD Migration: Enquiry Acceptance Workflow, Meetings & Google OAuth Tokens
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // ── 1. Inquiries state machine update ─────────────────────────────────
  pgm.sql("ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check");

  // Migrate legacy string statuses to official PRD workflow states
  pgm.sql("UPDATE inquiries SET status = 'PENDING' WHERE status IN ('new', 'viewed')");
  pgm.sql("UPDATE inquiries SET status = 'ACCEPTED' WHERE status IN ('responded', 'in_discussion')");
  pgm.sql("UPDATE inquiries SET status = 'CLOSED' WHERE status NOT IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CLOSED')");

  pgm.alterColumn('inquiries', 'status', {
    default: 'PENDING',
  });

  pgm.addConstraint('inquiries', 'inquiries_status_check', {
    check: "status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CLOSED')",
  });

  pgm.addColumns('inquiries', {
    decline_reason: { type: 'text' },
  });

  // ── 2. Meetings table ──────────────────────────────────────────────────
  pgm.createTable('meetings', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    enquiry_id: {
      type: 'uuid',
      notNull: true,
      references: 'inquiries',
      onDelete: 'cascade',
    },
    created_by: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'cascade',
    },
    title: { type: 'text', notNull: true },
    scheduled_start: { type: 'timestamptz', notNull: true },
    scheduled_end: { type: 'timestamptz', notNull: true },
    google_event_id: { type: 'text' },
    google_meet_url: { type: 'text' },
    status: {
      type: 'text',
      notNull: true,
      default: 'SCHEDULED',
      check: "status IN ('SCHEDULED', 'CANCELLED', 'COMPLETED')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('meetings', 'enquiry_id');
  pgm.createIndex('meetings', 'created_by');

  // ── 3. Google OAuth Tokens table ──────────────────────────────────────
  pgm.createTable('user_google_tokens', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      references: 'users',
      onDelete: 'cascade',
    },
    access_token: { type: 'text' },
    refresh_token: { type: 'text', notNull: true },
    expiry_date: { type: 'bigint' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('user_google_tokens');
  pgm.dropTable('meetings');

  pgm.dropColumns('inquiries', ['decline_reason']);

  pgm.dropConstraint('inquiries', 'inquiries_status_check');
  pgm.addConstraint('inquiries', 'inquiries_status_check', {
    check: "status IN ('new', 'viewed', 'responded', 'in_discussion', 'closed')",
  });
};
