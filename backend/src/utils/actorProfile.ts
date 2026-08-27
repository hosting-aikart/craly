import sql from '../db/index';

/** Resolves the caller's own business_profiles row from their user id. */
export async function getOwnBusinessProfile(userId: string) {
  const [row] = await sql`SELECT id, company_name FROM business_profiles WHERE user_id = ${userId}`;
  return row as { id: string; company_name: string } | undefined;
}

/** Resolves the caller's own contractor_profiles row from their user id. */
export async function getOwnContractorProfile(userId: string) {
  const [row] = await sql`SELECT id, company_name FROM contractor_profiles WHERE user_id = ${userId}`;
  return row as { id: string; company_name: string } | undefined;
}
