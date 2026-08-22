'use strict';

/**
 * Migration: Create Admin Workspace tables (verification_reviews, reports, audit_logs, platform_events)
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */

exports.up = (pgm) => {
  // 1. Verification Reviews Table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS verification_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
      reviewer_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 2. Trust & Safety Reports Table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      related_enquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
      category VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      resolution_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 3. Admin Audit Logs Table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_id UUID,
      reason TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 4. Platform Events Table (For Funnel & Supply/Demand Analytics)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS platform_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(50) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      entity_type VARCHAR(50),
      entity_id UUID,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Indexes
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_verification_reviews_contractor ON verification_reviews(contractor_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_platform_events_type ON platform_events(event_type);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS platform_events CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS reports CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS verification_reviews CASCADE;`);
};
