import sql from '../src/db/index';

/**
 * Seeds `service_categories` with the audience segments Craly is built for
 * (matches the landing page's BuiltFor / FAQ copy). Safe to re-run —
 * uses ON CONFLICT DO NOTHING.
 */
const categories = [
  { name: 'Manufacturers', slug: 'manufacturers' },
  { name: 'EPC & Engineering', slug: 'epc-engineering' },
  { name: 'Construction', slug: 'construction' },
  { name: 'Infrastructure', slug: 'infrastructure' },
  { name: 'Warehousing & Logistics', slug: 'warehousing-logistics' },
];

async function seed() {
  for (const category of categories) {
    await sql`
      INSERT INTO service_categories (name, slug)
      VALUES (${category.name}, ${category.slug})
      ON CONFLICT (slug) DO NOTHING
    `;
  }
  console.log(`[seed] service_categories seeded (${categories.length} rows checked).`);
  await sql.end();
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
