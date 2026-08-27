import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import sql from '../src/db/index';
import { hashPassword } from '../src/utils/password';

/**
 * Provisions an internal staff account (Ops Head or Field Intelligence
 * Staff) directly in the database — there is no public signup for these
 * roles, matching the seedAdmin.ts convention.
 *
 * Usage:
 *   STAFF_ROLE=ops_head STAFF_EMAIL=ops@craly.com STAFF_PASSWORD=... npx ts-node scripts/seedStaff.ts
 *   STAFF_ROLE=field_staff STAFF_EMAIL=field1@craly.com STAFF_PASSWORD=... npx ts-node scripts/seedStaff.ts
 */
async function seedStaff() {
  const role = process.env.STAFF_ROLE;
  if (role !== 'ops_head' && role !== 'field_staff') {
    throw new Error("STAFF_ROLE must be 'ops_head' or 'field_staff'");
  }

  const email = process.env.STAFF_EMAIL;
  const password = process.env.STAFF_PASSWORD;
  if (!email || !password) {
    throw new Error('STAFF_EMAIL and STAFF_PASSWORD are required');
  }

  console.log(`🔐 Provisioning ${role} user: ${email}...`);

  const passwordHash = await hashPassword(password);

  const [user] = await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES (${email}, ${passwordHash}, ${role})
    ON CONFLICT (email)
    DO UPDATE SET password_hash = ${passwordHash}, role = ${role}, updated_at = now()
    RETURNING id, email, role, created_at
  `;

  console.log(`✅ Staff account provisioned successfully!`);
  console.log(`User ID: ${user.id}`);
  console.log(`Email:   ${user.email}`);
  console.log(`Role:    ${user.role}`);

  process.exit(0);
}

seedStaff().catch((err) => {
  console.error('❌ Failed to seed staff user:', err);
  process.exit(1);
});
