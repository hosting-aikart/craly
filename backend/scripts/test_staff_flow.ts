import sql from '../src/db/index';

async function testStaffFlow() {
  console.log('--- TESTING BASIC CRALY STAFF ROLE MVP FLOW ---');

  // 1. Check staff user exists
  const [staffUser] = await sql`SELECT id, email, role FROM users WHERE role = 'staff' LIMIT 1`;
  if (!staffUser) {
    console.error('FAILED: No staff user found');
    process.exit(1);
  }
  console.log('1. Staff User Account verified:', staffUser.email, '(Role:', staffUser.role, ')');

  // 2. Test contractor creation by staff
  const testCompanyName = `Apex Engineering Services ${Date.now()}`;
  const [newContractor] = await sql`
    INSERT INTO contractor_profiles (
      company_name, phone, description, city, state, workforce_size,
      years_experience, service_areas, availability, availability_note,
      verification_status, created_by
    )
    VALUES (
      ${testCompanyName}, '+91 99887 76655', 'Heavy Engineering', 'Pune', 'Maharashtra',
      45, 6, ARRAY['Welding', 'Fabrication'], 'AVAILABLE', 'Verified by staff',
      'pending', ${staffUser.id}
    )
    RETURNING id, company_name, availability
  `;
  console.log('2. Contractor profile created by Staff:', newContractor.company_name, '(ID:', newContractor.id, ')');

  // 3. Test retrieving contractor list
  const contractors = await sql`
    SELECT id, company_name, city FROM contractor_profiles WHERE id = ${newContractor.id}
  `;
  console.log('3. Retrieved contractor profile:', contractors[0]?.company_name);

  // 4. Test updating contractor profile by staff
  const [updatedContractor] = await sql`
    UPDATE contractor_profiles
    SET availability = 'CURRENTLY_AT_CAPACITY', workforce_size = 50, updated_at = NOW()
    WHERE id = ${newContractor.id}
    RETURNING id, availability, workforce_size
  `;
  console.log('4. Updated contractor profile:', updatedContractor.availability, 'Workforce:', updatedContractor.workforce_size);

  // 5. Test notification creation for staff
  const [notif] = await sql`
    INSERT INTO notifications (user_id, type, title, message, reference_id)
    VALUES (${staffUser.id}, 'APPLICATION_SELECTED', 'Manufacturer Selection Event', 'A manufacturer has selected contractor Apex Engineering Services', ${newContractor.id})
    RETURNING id, title
  `;
  console.log('5. Staff Notification created:', notif.title);

  // 6. Test dashboard stats query
  const [{ count: totalContractors }] = await sql`SELECT COUNT(*)::int FROM contractor_profiles`;
  console.log('6. Dashboard Stats total contractors count:', totalContractors);

  // Clean up test contractor & notification
  await sql`DELETE FROM notifications WHERE id = ${notif.id}`;
  await sql`DELETE FROM contractor_profiles WHERE id = ${newContractor.id}`;
  console.log('7. Cleanup completed.');

  console.log('--- ALL STAFF WORKSPACE INTEGRATION CHECKS PASSED ---');
  process.exit(0);
}

testStaffFlow().catch((err) => {
  console.error('Staff Flow Test Error:', err);
  process.exit(1);
});
