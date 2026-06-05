const db = require('../config/db');

async function migrate() {
  try {
    console.log('Starting Cashfree migration...');
    // Add to shops
    await db.query(`ALTER TABLE shops ADD COLUMN IF NOT EXISTS cashfree_vendor_id VARCHAR(255);`);
    console.log('Added cashfree_vendor_id to shops');

    // Add to orders
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashfree_order_id VARCHAR(255);`);
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashfree_session_id VARCHAR(255);`);
    console.log('Added cashfree columns to orders');

    // Add to commitment_payments
    await db.query(`ALTER TABLE commitment_payments ADD COLUMN IF NOT EXISTS cashfree_order_id VARCHAR(255);`);
    await db.query(`ALTER TABLE commitment_payments ADD COLUMN IF NOT EXISTS cashfree_session_id VARCHAR(255);`);
    await db.query(`ALTER TABLE commitment_payments ADD COLUMN IF NOT EXISTS cashfree_payment_id VARCHAR(255);`);
    console.log('Added cashfree columns to commitment_payments');

    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
