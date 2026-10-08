import sql from '../src/db/index';
import { hashPassword } from '../src/utils/password';

async function seedStaffUser() {
  console.log('--- SEEDING CRALY STAFF USER ACCOUNT ---');

  const email = 'staff@craly.com';
  const password = 'StaffPass123!';

  const existing = await sql`SELECT id, role FROM users WHERE email = ${email}`;

  if (existing.length > 0) {
    const passwordHash = await hashPassword(password);
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, is_active = true 
      WHERE email = ${email}
    `;
    console.log(`Staff user ${email} updated with password ${password} (ID: ${existing[0].id}, Role: ${existing[0].role}).`);
  } else {
    const passwordHash = await hashPassword(password);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES (${email}, ${passwordHash}, 'staff', true)
      RETURNING id, email, role
    `;
    console.log(`Successfully created Staff user! Email: ${user.email}, Role: ${user.role}, Password: ${password}`);
  }

  process.exit(0);
}

seedStaffUser().catch((err) => {
  console.error('Failed to seed staff user:', err);
  process.exit(1);
});
