const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mykiranam',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function run() {
  await client.connect();
  try {
    console.log('Adding columns to customer_trust...');
    await client.query(`ALTER TABLE customer_trust ADD COLUMN IF NOT EXISTS active_order_limit INT DEFAULT 2`);
    await client.query(`ALTER TABLE customer_trust ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE`);
    await client.query(`ALTER TABLE customer_trust ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0`);
    await client.query(`ALTER TABLE customer_trust ADD COLUMN IF NOT EXISTS abandoned_orders INT DEFAULT 0`);
    await client.query(`ALTER TABLE customer_trust ADD COLUMN IF NOT EXISTS cancellation_warnings INT DEFAULT 0`);
    await client.query(`ALTER TABLE customer_trust ADD COLUMN IF NOT EXISTS no_pickup_warnings INT DEFAULT 0`);
    
    console.log('Creating seller_customer_blocks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS seller_customer_blocks (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(seller_id, customer_id)
      )
    `);
    
    console.log('Creating customer_reports table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_reports (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          reason VARCHAR(100) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'Pending Review',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
