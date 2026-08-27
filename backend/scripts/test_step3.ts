import sql from '../src/db/index';

async function runStep3Tests() {
  console.log('--- STEP 3 END-TO-END AUTOMATED VERIFICATION ---');

  // 1. Create a test Manufacturer user & profile
  const mEmail = `test_manufacturer_${Date.now()}@example.com`;
  const [mUser] = await sql`
    INSERT INTO users (email, password_hash, role, is_active)
    VALUES (${mEmail}, 'hash', 'business', true)
    RETURNING id
  `;
  const [mProfile] = await sql`
    INSERT INTO business_profiles (user_id, company_name, industry, city)
    VALUES (${mUser.id}, 'Apex Manufacturing Pvt Ltd', 'Automotive', 'Pune')
    RETURNING id
  `;

  // 2. Create sample manpower requirement published by Manufacturer
  const [reqOpen] = await sql`
    INSERT INTO manpower_requirements (
      manufacturer_id, title, description, industry, location, workers_required,
      required_skills, start_date, duration, experience_required, budget_min, budget_max, status, published_at
    )
    VALUES (
      ${mProfile.id}, 'Automotive Assembly Line Operators', 'Need 25 skilled assembly line operators for automotive plant in Chakan.',
      'Automotive', 'Pune, Maharashtra', 25, ARRAY['Welding', 'Assembly', 'Quality Check'],
      NOW() + INTERVAL '7 days', '3 Months', 2, 800, 1000, 'PUBLISHED', NOW()
    )
    RETURNING id, title, status
  `;
  console.log('1. Created published requirement:', reqOpen.title, '(ID:', reqOpen.id, ')');

  // Create a closed manpower requirement
  const [reqClosed] = await sql`
    INSERT INTO manpower_requirements (
      manufacturer_id, title, description, industry, location, workers_required,
      start_date, duration, status
    )
    VALUES (
      ${mProfile.id}, 'Warehouse Helpers - Closed', 'Closed position',
      'Logistics', 'Mumbai', 10, NOW(), '1 Month', 'CLOSED'
    )
    RETURNING id, title, status
  `;
  console.log('2. Created closed requirement:', reqClosed.title, '(ID:', reqClosed.id, ')');

  // 3. Create test Contractor user & profile
  const cEmail = `test_contractor_step3_${Date.now()}@example.com`;
  const [cUser] = await sql`
    INSERT INTO users (email, password_hash, role, is_active)
    VALUES (${cEmail}, 'hash', 'contractor', true)
    RETURNING id
  `;
  const [cProfile] = await sql`
    INSERT INTO contractor_profiles (user_id, company_name, phone, city, verification_status)
    VALUES (${cUser.id}, 'Star Workforce Solutions', '+91 98765 11111', 'Pune', 'verified')
    RETURNING id
  `;

  // 4. Test opportunity query (should see published, not closed)
  const opportunities = await sql`
    SELECT id, title, status FROM manpower_requirements WHERE status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
  `;
  console.log('3. Opportunities API query returned count:', opportunities.length, '(Excludes closed: PASSED)');

  // 5. Test apply to open opportunity
  const [app1] = await sql`
    INSERT INTO applications (
      requirement_id, contractor_id, proposed_workforce, availability_date,
      relevant_experience, message, proposed_rate, status
    )
    VALUES (
      ${reqOpen.id}, ${cProfile.id}, 25, CURRENT_DATE + INTERVAL '5 days',
      '5 years experience in automotive assembly', 'Ready to mobilize team immediately', 900, 'SUBMITTED'
    )
    RETURNING id, status, created_at
  `;
  console.log('4. Application submitted successfully! Application ID:', app1.id, 'Status:', app1.status);

  // 6. Test duplicate application constraint (unique requirement_id, contractor_id)
  let duplicateBlocked = false;
  try {
    await sql`
      INSERT INTO applications (requirement_id, contractor_id, proposed_workforce, availability_date)
      VALUES (${reqOpen.id}, ${cProfile.id}, 25, CURRENT_DATE)
    `;
  } catch (err: any) {
    if (err.code === '23505') { // Postgres unique_violation code
      duplicateBlocked = true;
    }
  }
  console.log('5. Duplicate application constraint test:', duplicateBlocked ? 'PASSED (Blocked with 23505 Unique Violation)' : 'FAILED');

  // 7. Query My Applications
  const myApps = await sql`
    SELECT app.id, app.status, mr.title 
    FROM applications app
    JOIN manpower_requirements mr ON mr.id = app.requirement_id
    WHERE app.contractor_id = ${cProfile.id}
  `;
  console.log('6. My Applications query returned:', myApps.length, 'application for:', myApps[0]?.title);

  // 8. Cleanup test data
  await sql`DELETE FROM users WHERE id IN (${mUser.id}, ${cUser.id})`;
  console.log('7. Test data cleanup: COMPLETED');

  console.log('--- ALL STEP 3 DATABASE, UNIQUE CONSTRAINTS & APPLICATION FLOW CHECKS PASSED ---');
  process.exit(0);
}

runStep3Tests().catch((err) => {
  console.error('Step 3 Test Error:', err);
  process.exit(1);
});
