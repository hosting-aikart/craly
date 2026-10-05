/**
 * Migration: contractor_worksite_photos
 * Stores uploaded worksite/project photos for contractor company profiles (max 10 per profile).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('contractor_worksite_photos', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    contractor_id: {
      type: 'uuid',
      notNull: true,
      references: 'contractor_profiles',
      onDelete: 'cascade',
    },
    storage_key: { type: 'text', notNull: true },
    file_name: { type: 'text', notNull: true },
    mime_type: { type: 'text', notNull: true },
    size_bytes: { type: 'integer', notNull: true },
    caption: { type: 'text' },
    display_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('contractor_worksite_photos', ['contractor_id', 'created_at']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('contractor_worksite_photos');
};
