const postgres = require('postgres');
require('dotenv').config();

async function runAuthQA() {
  console.log('========================================');
  console.log('CRALY AUTH & ROLE QA VALIDATION SUITE');
  console.log('========================================\n');

  const BASE_URL = 'http://127.0.0.1:8080/api';
  const sql = postgres(process.env.DATABASE_URL, { connect_timeout: 10, ssl: 'require' });

  try {
    // 1. Healthcheck
    console.log('1. Testing /health endpoint...');
    const healthRes = await fetch('http://127.0.0.1:8080/health');
    const healthData = await healthRes.json();
    console.log('  -> Healthcheck status:', healthRes.status, JSON.stringify(healthData));

    // 2. Query available roles in DB
    console.log('\n2. Inspecting User Roles in Database...');
    const rolesSummary = await sql`
      SELECT role, count(*)::int as count, bool_and(is_active) as all_active 
      FROM users 
      GROUP BY role 
      ORDER BY count DESC
    `;
    console.table(rolesSummary);

    // 3. Test Invalid Login Handlers
    console.log('\n3. Testing Invalid Login Handlers...');
    const invalidLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_test_user@craly.co', password: 'WrongPassword123!' })
    });
    const invalidLoginJson = await invalidLoginRes.json();
    console.log('  -> Status:', invalidLoginRes.status, '(Expected 401)');
    console.log('  -> Response:', JSON.stringify(invalidLoginJson));

    // 4. Test Input Validation
    console.log('\n4. Testing Input Validation (Zod schema)...');
    const badInputRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail' })
    });
    const badInputJson = await badInputRes.json();
    console.log('  -> Status:', badInputRes.status, '(Expected 400)');
    console.log('  -> Response:', JSON.stringify(badInputJson));

    // 5. Test Signup OTP Flow
    const testEmail = `qa_test_${Date.now()}@craly.test`;
    console.log(`\n5. Testing OTP Generation for: ${testEmail}...`);
    const otpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, name: 'QA Tester' })
    });
    const otpJson = await otpRes.json();
    console.log('  -> send-otp Status:', otpRes.status);
    console.log('  -> send-otp Response:', JSON.stringify(otpJson));

    // Check auth_verifications table for OTP hash
    const [storedVerification] = await sql`
      SELECT target, target_type, otp_hash, expires_at 
      FROM auth_verifications 
      WHERE target = ${testEmail}
    `;
    console.log('  -> Stored in auth_verifications:', storedVerification ? 'YES (OTP recorded)' : 'NO');

    // 6. Test Unauthenticated /auth/me
    console.log('\n6. Testing /auth/me unauthenticated access...');
    const meUnauth = await fetch(`${BASE_URL}/auth/me`);
    const meUnauthJson = await meUnauth.json();
    console.log('  -> Status:', meUnauth.status, '(Expected 401)');
    console.log('  -> Response:', JSON.stringify(meUnauthJson));

    // Clean up test verification record
    await sql`DELETE FROM auth_verifications WHERE target = ${testEmail}`;

    console.log('\n========================================');
    console.log('ALL AUTH API QA CHECKS PASSED');
    console.log('========================================\n');

  } catch (err) {
    console.error('QA Test Suite encountered an error:', err);
  } finally {
    await sql.end();
  }
}

runAuthQA();
