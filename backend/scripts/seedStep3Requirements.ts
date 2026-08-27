import sql from '../src/db/index';

async function seedStep3Data() {
  console.log('--- SEEDING STEP 3 MANPOWER REQUIREMENTS ---');

  // Check if sample business profile exists or create one
  let [mProfile] = await sql`SELECT id FROM business_profiles LIMIT 1`;
  if (!mProfile) {
    const [mUser] = await sql`
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES ('sample_manufacturer@craly.com', 'hash', 'business', true)
      RETURNING id
    `;
    [mProfile] = await sql`
      INSERT INTO business_profiles (user_id, company_name, industry, city)
      VALUES (${mUser.id}, 'Precision Auto Components Ltd', 'Automotive', 'Pune')
      RETURNING id
    `;
  }

  // Check if sample requirements exist
  const existingReqs = await sql`SELECT id FROM manpower_requirements LIMIT 1`;
  if (existingReqs.length === 0) {
    await sql`
      INSERT INTO manpower_requirements (
        manufacturer_id, title, description, industry, location, workers_required,
        required_skills, start_date, duration, experience_required, budget_min, budget_max, status, published_at
      )
      VALUES 
      (
        ${mProfile.id}, 'CNC Machine Operators & Fitters',
        'Looking for 15 experienced CNC machine operators and mechanical fitters for shift operations in Chakan MIDC, Pune.',
        'Manufacturing', 'Pune, Maharashtra', 15, ARRAY['CNC Machining', 'Fitting', 'Quality Control'],
        NOW() + INTERVAL '5 days', '6 Months', 3, 900, 1200, 'PUBLISHED', NOW()
      ),
      (
        ${mProfile.id}, 'Warehouse & Logistics Staff',
        'Urgent requirement for 30 warehouse helpers and forklift drivers for inventory handling and loading.',
        'Logistics', 'Bhiwandi, Maharashtra', 30, ARRAY['Forklift Operation', 'Inventory Handling', 'Packaging'],
        NOW() + INTERVAL '3 days', '3 Months', 1, 700, 950, 'APPLICATIONS_OPEN', NOW()
      )
    `;
    console.log('Sample manpower requirements seeded successfully.');
  } else {
    console.log('Sample manpower requirements already exist.');
  }

  process.exit(0);
}

seedStep3Data().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
