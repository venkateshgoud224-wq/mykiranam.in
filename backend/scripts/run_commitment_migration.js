// run_commitment_migration.js
// Executes the ALTER TABLE statements that add the commitment‑payment columns to the orders table.
// Uses the existing db helper (backend/config/db.js) so it works with both real PostgreSQL
// and the in‑memory mock DB used during development.

const db = require('../config/db');

const sql = `
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS traditional_price DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_fee          DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee    DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surge_fee       DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_commitment  DECIMAL(10,2) DEFAULT 0;
`;

(async () => {
  try {
    await db.query(sql);
    console.log('✅ Commitment columns added (or already existed).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
})();
