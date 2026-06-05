const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  console.log('Starting Phase 7B Trust & Suspicious Activity Database Migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Altering customer_trust table...');
    await client.query(`
      ALTER TABLE customer_trust 
      ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 100,
      ADD COLUMN IF NOT EXISTS customer_level VARCHAR(50) DEFAULT 'Platinum Customer',
      ADD COLUMN IF NOT EXISTS fake_complaints INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS abuse_reports INT DEFAULT 0;
    `);

    console.log('Altering seller_performance table...');
    await client.query(`
      ALTER TABLE seller_performance 
      ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 100,
      ADD COLUMN IF NOT EXISTS seller_level VARCHAR(50) DEFAULT 'Platinum Seller',
      ADD COLUMN IF NOT EXISTS complaint_rate DECIMAL(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS verified_complaints INT DEFAULT 0;
    `);

    console.log('Creating suspicious_activities table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS suspicious_activities (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        risk_score INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Approved', 'Dismissed')),
        related_orders JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Migration successful!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
