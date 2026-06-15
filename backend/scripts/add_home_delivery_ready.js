const db = require('../config/db');

async function applyMigration() {
  try {
    console.log('Adding home_delivery_ready column to shops table...');
    await db.query(`
      ALTER TABLE shops 
      ADD COLUMN IF NOT EXISTS home_delivery_ready BOOLEAN DEFAULT false;
    `);
    console.log('✓ Successfully added home_delivery_ready column.');
  } catch (err) {
    console.error('Error executing migration:', err.message);
  } finally {
    process.exit(0);
  }
}

applyMigration();
