import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import sql from '../src/db/index';
import { signAuthToken } from '../src/utils/jwt';
import { comparePassword, hashPassword } from '../src/utils/password';

async function runStaffCreateManufacturerTests() {
  console.log('🧪 Starting Test Suite: Staff Create Manufacturer Account Feature');

  const testStaffEmail = 'test_staff_mfr_creator@craly.com';
  const testContractorEmail = 'test_contractor_unauthorized@craly.com';
  const testManufacturerEmail = 'test_mfr_created_by_staff@craly.com';
  const testTempPassword = 'SecurePass123!@#';

  let staffUserId: string | null = null;
  let contractorUserId: string | null = null;
  let createdManufacturerUserId: string | null = null;
  let createdBusinessProfileId: string | null = null;

  try {
    // 0. Cleanup any old test records
    await sql`DELETE FROM users WHERE email IN (${testStaffEmail}, ${testContractorEmail}, ${testManufacturerEmail})`;

    // 1. Create a test Staff user and a test Contractor user
    const staffHash = await hashPassword('StaffPassword123!');
    const [staffUser] = await sql`
      INSERT INTO users (email, password_hash, role, is_active, is_email_verified)
      VALUES (${testStaffEmail}, ${staffHash}, 'staff', true, true)
      RETURNING id, email, role
    `;
    staffUserId = staffUser.id;

    const contractorHash = await hashPassword('ContractorPass123!');
    const [contractorUser] = await sql`
      INSERT INTO users (email, password_hash, role, is_active, is_email_verified)
      VALUES (${testContractorEmail}, ${contractorHash}, 'contractor', true, true)
      RETURNING id, email, role
    `;
    contractorUserId = contractorUser.id;

    const staffToken = signAuthToken({ sub: staffUser.id, role: staffUser.role });
    const contractorToken = signAuthToken({ sub: contractorUser.id, role: contractorUser.role });

    console.log('✅ Staff and Contractor test accounts provisioned.');

    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || '8080'}/api`;

    // ── Test 1: Unauthenticated request should be rejected (401) ─────────────
    console.log('\n[Test 1] Testing unauthenticated access to POST /staff/manufacturers...');
    const unauthRes = await fetch(`${baseUrl}/staff/manufacturers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Unauth Co',
        email: 'unauth@craly.com',
        password: testTempPassword,
      }),
    });
    if (unauthRes.status === 401) {
      console.log('✓ PASS: Unauthenticated request rejected with 401.');
    } else {
      throw new Error(`FAILED: Expected 401, got ${unauthRes.status}`);
    }

    // ── Test 2: Non-staff (Contractor) request should be rejected (403) ───────
    console.log('\n[Test 2] Testing non-staff (Contractor) access to POST /staff/manufacturers...');
    const forbiddenRes = await fetch(`${baseUrl}/staff/manufacturers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contractorToken}`,
      },
      body: JSON.stringify({
        companyName: 'Forbidden Co',
        email: 'forbidden@craly.com',
        password: testTempPassword,
      }),
    });
    if (forbiddenRes.status === 403) {
      console.log('✓ PASS: Non-staff user rejected with 403 Forbidden.');
    } else {
      throw new Error(`FAILED: Expected 403, got ${forbiddenRes.status}`);
    }

    // ── Test 3: Validation failure on invalid email or short password (400) ───
    console.log('\n[Test 3] Testing validation errors (short password, invalid email)...');
    const invalidRes = await fetch(`${baseUrl}/staff/manufacturers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        companyName: 'Invalid Co',
        email: 'not-an-email',
        password: 'short',
      }),
    });
    if (invalidRes.status === 400) {
      const body = await invalidRes.json();
      console.log('✓ PASS: Validation rejected with 400:', body.error?.message);
    } else {
      throw new Error(`FAILED: Expected 400, got ${invalidRes.status}`);
    }

    // ── Test 4: Successful creation by Staff (201) ───────────────────────────
    console.log('\n[Test 4] Testing successful manufacturer creation by Staff...');
    const createRes = await fetch(`${baseUrl}/staff/manufacturers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        companyName: 'Bharat Motors & Heavy Engineering Ltd',
        email: testManufacturerEmail,
        password: testTempPassword,
        phone: '+919876543210',
        industry: 'Automotive & Heavy Machinery',
        city: 'Pune',
        state: 'Maharashtra',
      }),
    });

    if (createRes.status === 201) {
      const createBody = await createRes.json();
      console.log('✓ PASS: Manufacturer created successfully (201):', createBody.data.company_name);
      createdBusinessProfileId = createBody.data.id;
      createdManufacturerUserId = createBody.data.user_id;
    } else {
      const errBody = await createRes.text();
      throw new Error(`FAILED: Expected 201, got ${createRes.status}: ${errBody}`);
    }

    // Verify DB integrity
    const [dbUser] = await sql`SELECT id, email, role, is_active, is_email_verified, password_hash FROM users WHERE email = ${testManufacturerEmail}`;
    if (!dbUser || dbUser.role !== 'business' || !dbUser.is_active || !dbUser.is_email_verified) {
      throw new Error('FAILED: User row in DB does not match expected business role or verified state');
    }
    const isPassMatch = await comparePassword(testTempPassword, dbUser.password_hash);
    if (!isPassMatch) {
      throw new Error('FAILED: Password hash does not verify against temporary password');
    }
    console.log('✓ PASS: Database user record verified (role: business, active: true, email_verified: true, password hashed properly).');

    const [dbProfile] = await sql`SELECT id, user_id, company_name, industry, city, state, phone, onboarding_complete FROM business_profiles WHERE id = ${createdBusinessProfileId}`;
    if (!dbProfile || dbProfile.user_id !== dbUser.id || dbProfile.company_name !== 'Bharat Motors & Heavy Engineering Ltd' || !dbProfile.onboarding_complete) {
      throw new Error('FAILED: business_profiles row in DB does not match expected fields');
    }
    console.log('✓ PASS: Database business_profiles record verified (linked to user_id, onboarding_complete: true).');

    const [dbOrgMember] = await sql`SELECT id, user_id, business_profile_id, org_role, status FROM organization_members WHERE user_id = ${dbUser.id}`;
    if (!dbOrgMember || dbOrgMember.business_profile_id !== dbProfile.id || dbOrgMember.org_role !== 'admin' || dbOrgMember.status !== 'active') {
      throw new Error('FAILED: organization_members row missing or incorrect');
    }
    console.log('✓ PASS: Database organization_members record verified (org_role: admin, status: active).');

    // ── Test 5: Duplicate email rejection (409) ──────────────────────────────
    console.log('\n[Test 5] Testing duplicate email rejection...');
    const dupRes = await fetch(`${baseUrl}/staff/manufacturers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        companyName: 'Duplicate Motors',
        email: testManufacturerEmail,
        password: testTempPassword,
      }),
    });
    if (dupRes.status === 409) {
      console.log('✓ PASS: Duplicate email rejected with 409 Conflict.');
    } else {
      throw new Error(`FAILED: Expected 409, got ${dupRes.status}`);
    }

    // ── Test 6: Manufacturer logs in normally with created credentials ───────
    console.log('\n[Test 6] Testing login with newly created Manufacturer credentials...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testManufacturerEmail,
        password: testTempPassword,
      }),
    });
    if (loginRes.status === 200) {
      const loginBody = await loginRes.json();
      console.log('✓ PASS: Manufacturer logged in successfully! Role returned:', loginBody.data.role);
    } else {
      const errBody = await loginRes.text();
      throw new Error(`FAILED: Expected 200 on login, got ${loginRes.status}: ${errBody}`);
    }

    // ── Test 7: Staff lists manufacturers ────────────────────────────────────
    console.log('\n[Test 7] Testing GET /staff/manufacturers...');
    const listRes = await fetch(`${baseUrl}/staff/manufacturers?q=Bharat`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    if (listRes.status === 200) {
      const listBody = await listRes.json();
      const found = listBody.data.find((m: any) => m.email === testManufacturerEmail);
      if (found) {
        console.log('✓ PASS: Found created manufacturer in staff directory list:', found.company_name);
      } else {
        throw new Error('FAILED: Created manufacturer not found in list');
      }
    } else {
      throw new Error(`FAILED: Expected 200 from list, got ${listRes.status}`);
    }

    // ── Test 8: Staff gets manufacturer by ID ────────────────────────────────
    console.log('\n[Test 8] Testing GET /staff/manufacturers/:id...');
    const detailRes = await fetch(`${baseUrl}/staff/manufacturers/${createdBusinessProfileId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    if (detailRes.status === 200) {
      const detailBody = await detailRes.json();
      console.log('✓ PASS: Manufacturer detail retrieved:', detailBody.data.company_name, 'Requirements count:', detailBody.data.requirements?.length ?? 0);
    } else {
      throw new Error(`FAILED: Expected 200 from detail, got ${detailRes.status}`);
    }

    console.log('\n============================================================');
    console.log('🎉 ALL TESTS PASSED! Staff Manufacturer Creation is 100% verified.');
    console.log('============================================================\n');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    console.log('Cleaning up test records...');
    if (createdManufacturerUserId) {
      await sql`DELETE FROM organization_members WHERE user_id = ${createdManufacturerUserId}`;
      await sql`DELETE FROM business_profiles WHERE user_id = ${createdManufacturerUserId}`;
      await sql`DELETE FROM users WHERE id = ${createdManufacturerUserId}`;
    }
    if (staffUserId) await sql`DELETE FROM users WHERE id = ${staffUserId}`;
    if (contractorUserId) await sql`DELETE FROM users WHERE id = ${contractorUserId}`;
    console.log('Cleanup complete.');
  }
}

runStaffCreateManufacturerTests().then(() => {
  process.exit(process.exitCode || 0);
});
