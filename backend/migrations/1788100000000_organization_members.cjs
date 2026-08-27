/**
 * organization_members — the multi-user-per-company model.
 *
 * `business_profiles.user_id` and `contractor_profiles.user_id` are both
 * UNIQUE today, meaning exactly one login can act on a given company. The
 * final Phase 01 client prototype demonstrates "Business Admin / Business
 * User" and "Contractor Admin / Contractor User" sub-roles with a team/invite
 * page for both personas — i.e. multiple logins per company, which the
 * current schema cannot represent at all.
 *
 * Rather than inventing a generic polymorphic "organizations" entity, this
 * adds one join table with two real, mutually-exclusive foreign keys (exactly
 * one of business_profile_id / contractor_profile_id set per row) and a
 * minimal two-value org_role. That keeps every reference a normal FK
 * (joinable, indexable, cascades correctly) instead of an org_type/org_id
 * pair that Postgres can't itself enforce referential integrity on.
 *
 * Purely additive: does not touch users, business_profiles, or
 * contractor_profiles. Backfills one 'admin'/'active' row per existing
 * profile that already has a live user_id, so every current login keeps
 * exactly the access it has today once application code switches to reading
 * organization_members. The direct user_id columns on business_profiles/
 * contractor_profiles are left in place — retiring them from the
 * authorization path is later, incremental application work, not part of
 * this migration.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('organization_members', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'cascade' },
    business_profile_id: { type: 'uuid', references: 'business_profiles', onDelete: 'cascade' },
    contractor_profile_id: { type: 'uuid', references: 'contractor_profiles', onDelete: 'cascade' },
    org_role: {
      type: 'text',
      notNull: true,
      default: 'member',
      check: "org_role IN ('admin', 'member')",
    },
    status: {
      type: 'text',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'invited')",
    },
    invited_by: { type: 'uuid', references: 'users', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Exactly one of the two profile FKs must be set — a membership row always
  // belongs to either a business org or a contractor org, never both, never
  // neither.
  pgm.addConstraint('organization_members', 'organization_members_one_profile_check', {
    check: 'num_nonnulls(business_profile_id, contractor_profile_id) = 1',
  });

  // A user can only have one membership row per org. NULLs don't collide
  // under a unique constraint, so each of these only constrains the profile
  // type that row actually references, not the other (always-null) column.
  pgm.addConstraint('organization_members', 'organization_members_business_unique', {
    unique: ['user_id', 'business_profile_id'],
  });
  pgm.addConstraint('organization_members', 'organization_members_contractor_unique', {
    unique: ['user_id', 'contractor_profile_id'],
  });

  pgm.createIndex('organization_members', 'user_id');
  pgm.createIndex('organization_members', 'business_profile_id');
  pgm.createIndex('organization_members', 'contractor_profile_id');

  // Backfill: every existing profile with a live user_id gets one
  // 'admin'/'active' membership row. Today that's business_profiles only —
  // every contractor_profiles.user_id is NULL post-reconciliation, disabled
  // legacy accounts included — but both queries are written generically so
  // they stay correct regardless of ordering relative to other work.
  pgm.sql(`
    INSERT INTO organization_members (user_id, business_profile_id, org_role, status)
    SELECT user_id, id, 'admin', 'active'
    FROM business_profiles
    WHERE user_id IS NOT NULL
  `);
  pgm.sql(`
    INSERT INTO organization_members (user_id, contractor_profile_id, org_role, status)
    SELECT user_id, id, 'admin', 'active'
    FROM contractor_profiles
    WHERE user_id IS NOT NULL
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('organization_members');
};
