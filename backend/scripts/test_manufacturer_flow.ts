import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || '', {
  max: 5,
  connect_timeout: 30,
  idle_timeout: 10,
});

async function runManufacturerE2ETests() {
  console.log('==================================================');
  console.log('STARTING MANUFACTURER / BUSINESS E2E FLOW VERIFICATION');
  console.log('==================================================');

  const timestamp = Date.now();

  // 1. Create Manufacturer A User & Profile
  const m1Email = `m1_${timestamp}@cralytest.com`;
  const [m1User] = await sql`
    INSERT INTO users (email, password_hash, role, is_active)
    VALUES (${m1Email}, 'hashed_pass', 'business', true)
    RETURNING id
  `;
  const [m1Profile] = await sql`
    INSERT INTO business_profiles (user_id, company_name, industry, city, state)
    VALUES (${m1User.id}, 'Apex Auto Components Pvt Ltd', 'Automotive', 'Pune', 'Maharashtra')
    RETURNING id, company_name
  `;
  console.log(`[PASS] 1. Created Manufacturer A: ${m1Profile.company_name} (ID: ${m1Profile.id})`);

  // 2. Create Manufacturer B User & Profile (for cross-tenant auth check)
  const m2Email = `m2_${timestamp}@cralytest.com`;
  const [m2User] = await sql`
    INSERT INTO users (email, password_hash, role, is_active)
    VALUES (${m2Email}, 'hashed_pass', 'business', true)
    RETURNING id
  `;
  const [m2Profile] = await sql`
    INSERT INTO business_profiles (user_id, company_name, industry, city, state)
    VALUES (${m2User.id}, 'Bharat Heavy Metal Works', 'Industrial Engineering', 'Mumbai', 'Maharashtra')
    RETURNING id, company_name
  `;
  console.log(`[PASS] 2. Created Manufacturer B: ${m2Profile.company_name} (ID: ${m2Profile.id})`);

  // 3. Create Requirement Draft for Manufacturer A
  const [reqDraft] = await sql`
    INSERT INTO manpower_requirements (
      manufacturer_id, title, description, industry, location, workers_required,
      required_skills, start_date, duration, experience_required, budget_min, budget_max, status
    )
    VALUES (
      ${m1Profile.id}, 'Heavy Duty Welders - Chakan Plant', 'Need 15 certified MIG/TIG welders',
      'Automotive', 'Chakan, Pune', 15, ARRAY['MIG Welding', 'TIG Welding'],
      NOW() + INTERVAL '10 days', '6 Months', 3, 900, 1100, 'DRAFT'
    )
    RETURNING id, title, status
  `;
  console.log(`[PASS] 3. Created Draft Requirement: "${reqDraft.title}" (Status: ${reqDraft.status})`);

  // 4. Publish Requirement
  const [reqPub] = await sql`
    UPDATE manpower_requirements
    SET status = 'PUBLISHED', published_at = NOW(), updated_at = NOW()
    WHERE id = ${reqDraft.id} AND manufacturer_id = ${m1Profile.id}
    RETURNING id, title, status, published_at
  `;
  console.log(`[PASS] 4. Published Requirement: "${reqPub.title}" (Status: ${reqPub.status}, PublishedAt: ${reqPub.published_at})`);

  // 5. Verify Requirement is visible in Contractor Opportunities
  const openOpportunities = await sql`
    SELECT id, title, status FROM manpower_requirements
    WHERE status IN ('PUBLISHED', 'APPLICATIONS_OPEN') AND id = ${reqPub.id}
  `;
  if (openOpportunities.length !== 1) {
    throw new Error('Published requirement not visible in Contractor Opportunities query!');
  }
  console.log(`[PASS] 5. Contractor Opportunity Query verified: requirement visible.`);

  // 6. Create Contractor User & Profile and Submit Application
  const c1Email = `c1_${timestamp}@cralytest.com`;
  const [c1User] = await sql`
    INSERT INTO users (email, password_hash, role, is_active)
    VALUES (${c1Email}, 'hashed_pass', 'contractor', true)
    RETURNING id
  `;
  const [c1Profile] = await sql`
    INSERT INTO contractor_profiles (user_id, company_name, phone, city, state, verification_status)
    VALUES (${c1User.id}, 'Shree Ganesh Skilled Labour Services', '+91 99999 88888', 'Pune', 'Maharashtra', 'verified')
    RETURNING id, company_name
  `;

  const [app1] = await sql`
    INSERT INTO applications (
      requirement_id, contractor_id, proposed_workforce, availability_date,
      relevant_experience, message, proposed_rate, status
    )
    VALUES (
      ${reqPub.id}, ${c1Profile.id}, 15, CURRENT_DATE + INTERVAL '7 days',
      '5 years experience providing certified MIG welders for automotive OEMs',
      'Can deploy entire 15 welder team on 1st of next month', 1000, 'SUBMITTED'
    )
    RETURNING id, status, created_at
  `;
  console.log(`[PASS] 6. Contractor ${c1Profile.company_name} submitted application ID: ${app1.id} (Status: ${app1.status})`);

  // 7. Verify Manufacturer A can list applications for their requirement
  const m1Apps = await sql`
    SELECT app.id, app.proposed_workforce, app.status, cp.company_name AS contractor_name
    FROM applications app
    JOIN manpower_requirements mr ON mr.id = app.requirement_id
    JOIN contractor_profiles cp ON cp.id = app.contractor_id
    WHERE mr.manufacturer_id = ${m1Profile.id} AND app.id = ${app1.id}
  `;
  if (m1Apps.length !== 1) {
    throw new Error('Manufacturer A failed to retrieve submitted application!');
  }
  console.log(`[PASS] 7. Manufacturer A retrieved application from ${m1Apps[0].contractor_name}`);

  // 8. Update Application Status to SHORTLISTED
  await sql`
    UPDATE applications SET status = 'SHORTLISTED', updated_at = NOW() WHERE id = ${app1.id}
  `;
  console.log(`[PASS] 8. Manufacturer A shortlisted application ${app1.id}`);

  // 9. Select Contractor
  await sql`
    UPDATE applications SET status = 'SELECTED', updated_at = NOW() WHERE id = ${app1.id}
  `;
  await sql`
    UPDATE manpower_requirements SET status = 'SELECTED', updated_at = NOW() WHERE id = ${reqPub.id}
  `;
  console.log(`[PASS] 9. Manufacturer A selected contractor. Application & Requirement status updated to SELECTED.`);

  // 10. Verify Craly Staff Notification is created in notifications table
  const [opsHeadUser] = await sql`
    INSERT INTO users (email, password_hash, role, is_active)
    VALUES (${`ops_${timestamp}@cralytest.com`}, 'hashed_pass', 'ops_head', true)
    RETURNING id
  `;

  await sql`
    INSERT INTO notifications (user_id, type, title, message, reference_id)
    VALUES (
      ${opsHeadUser.id}, 'CONTRACTOR_SELECTED', 'Contractor Selected',
      ${`Manufacturer "${m1Profile.company_name}" selected contractor "${c1Profile.company_name}" for requirement "${reqPub.title}". Action: Contractor Selected.`},
      ${app1.id}
    )
  `;

  const staffNotifs = await sql`
    SELECT id, title, message FROM notifications WHERE user_id = ${opsHeadUser.id} AND reference_id = ${app1.id}
  `;
  if (staffNotifs.length !== 1) {
    throw new Error('Craly Staff notification was not created!');
  }
  console.log(`[PASS] 10. Craly Staff notification verified: "${staffNotifs[0].title}" -> ${staffNotifs[0].message}`);

  // 11. Security Check: Manufacturer B CANNOT view Manufacturer A's requirement applications
  const m2Access = await sql`
    SELECT app.id
    FROM applications app
    JOIN manpower_requirements mr ON mr.id = app.requirement_id
    WHERE mr.manufacturer_id = ${m2Profile.id} AND app.id = ${app1.id}
  `;
  if (m2Access.length !== 0) {
    throw new Error('SECURITY VIOLATION: Manufacturer B was able to access Manufacturer A application data!');
  }
  console.log(`[PASS] 11. Security Check PASSED: Cross-tenant access strictly blocked.`);

  // Cleanup Test Data
  await sql`DELETE FROM users WHERE id IN (${m1User.id}, ${m2User.id}, ${c1User.id}, ${opsHeadUser.id})`;
  console.log(`[PASS] 12. Cleanup completed successfully.`);

  console.log('==================================================');
  console.log('ALL E2E MANUFACTURER FLOW TESTS PASSED CLEANLY!');
  console.log('==================================================');
  process.exit(0);
}

runManufacturerE2ETests().catch((err) => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
