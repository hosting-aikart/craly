import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import sql from '../src/db/index';
import { hashPassword } from '../src/utils/password';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@craly.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

  console.log(`🔐 Provisioning admin user: ${email}...`);

  const passwordHash = await hashPassword(password);

  const [user] = await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES (${email}, ${passwordHash}, 'admin')
    ON CONFLICT (email)
    DO UPDATE SET password_hash = ${passwordHash}, role = 'admin', updated_at = now()
    RETURNING id, email, role, created_at
  `;

  console.log(`✅ Admin account provisioned successfully!`);
  console.log(`User ID: ${user.id}`);
  console.log(`Email:   ${user.email}`);
  console.log(`Role:    ${user.role}`);

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('❌ Failed to seed admin user:', err);
  process.exit(1);
});
