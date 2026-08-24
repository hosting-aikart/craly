/**
 * business_profiles never had a phone column — contractor_profiles got one
 * (1787800000000_contractor_phone.cjs) specifically so Staff could reach a
 * contractor, but the manufacturer side of that same need was missed. The
 * Staff coordination flow requires a manufacturer contact number (email
 * already exists via users.email), so this is genuinely missing, not a
 * duplicate of anything.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('business_profiles', {
    phone: { type: 'text' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumn('business_profiles', 'phone');
};
