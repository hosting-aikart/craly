/**
 * Staff need a way to actually reach a contractor (WhatsApp/phone, per
 * scope §1/§23) — contractor_profiles never had a phone column since the
 * old self-service flow didn't ask for one at signup.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns('contractor_profiles', {
    phone: { type: 'text' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumn('contractor_profiles', 'phone');
};
