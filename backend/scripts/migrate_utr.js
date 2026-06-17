const db = require('../config/db');

async function migrate() {
  try {
    console.log('Starting UTR column migration...');
    // Add payment_utr to orders
    await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_utr VARCHAR(100);`);
    console.log('Successfully added payment_utr to orders table');
    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
