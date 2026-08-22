/**
 * inquiry_messages.receiver_id was NOT NULL on the assumption that a
 * contractor is always a real `users` row. Now that most contractors are
 * staff-managed (no login), a business-sent message has no contractor user
 * to receive it — it's queued for whichever staff member picks up the
 * enquiry instead. Staff-sent messages (acting for the contractor) still
 * have a real receiver: the business user.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql('ALTER TABLE inquiry_messages ALTER COLUMN receiver_id DROP NOT NULL');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql('ALTER TABLE inquiry_messages ALTER COLUMN receiver_id SET NOT NULL');
};
