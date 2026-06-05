const db = require('./config/db');

async function alterTable() {
  try {
    await db.query(`ALTER TABLE commitment_payments ADD COLUMN razorpay_payment_id TEXT;`);
    console.log('Successfully added razorpay_payment_id column to commitment_payments');
  } catch (err) {
    if (err.code === '42701') {
      console.log('Column already exists, ignoring.');
    } else {
      console.error('Error altering table:', err);
    }
  } finally {
    process.exit(0);
  }
}

alterTable();
