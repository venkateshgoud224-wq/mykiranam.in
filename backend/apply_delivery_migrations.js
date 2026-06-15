const db = require('./config/db');

async function applyMigrations() {
  try {
    console.log('Starting Delivery Navigation & Customer Location database migrations...');

    // 1. Alter shops table
    try {
      await db.query(`
        ALTER TABLE shops 
        ADD COLUMN IF NOT EXISTS delivery_option VARCHAR(30) DEFAULT 'Pickup Only' CHECK (delivery_option IN ('Pickup Only', 'Delivery Only', 'Pickup + Delivery')),
        ADD COLUMN IF NOT EXISTS delivery_charges DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(100) DEFAULT '';
      `);
      console.log('✓ Successfully altered shops table (added delivery options)');
    } catch (err) {
      console.error('Error altering shops table:', err.message);
    }

    // 2. Alter orders table
    try {
      await db.query(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS fulfillment_method VARCHAR(20) DEFAULT 'Pickup' CHECK (fulfillment_method IN ('Pickup', 'Delivery')),
        ADD COLUMN IF NOT EXISTS delivery_address TEXT,
        ADD COLUMN IF NOT EXISTS delivery_landmark TEXT,
        ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(9,6),
        ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(9,6);
      `);
      console.log('✓ Successfully altered orders table (added delivery details)');
    } catch (err) {
      console.error('Error altering orders table:', err.message);
    }

    console.log('Database migrations completed successfully.');
  } catch (err) {
    console.error('Migration execution failed:', err);
  } finally {
    process.exit(0);
  }
}

applyMigrations();
