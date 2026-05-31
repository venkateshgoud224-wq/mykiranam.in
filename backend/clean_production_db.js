require('dotenv').config();
const { Pool } = require('pg');

async function removeSeededData() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable is missing.');
    console.log('Please run this script in an environment where DATABASE_URL is set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('⚡ Connecting to the live PostgreSQL database...');
    
    // We remove the known dummy/seed accounts.
    // The schema has ON DELETE CASCADE for shops, orders, notifications, etc.
    // Deleting these users will cascade and delete their shops, orders, and related data.
    const emailsToDelete = [
      'admin@mykiranam.in',
      'venkateshgoud224@gmail.com',
      'seller_canvas@gmail.com'
    ];

    console.log(`🗑️ Deleting seed users and cascading to their shops and orders...`);
    
    for (const email of emailsToDelete) {
      const res = await pool.query('DELETE FROM users WHERE email = $1 RETURNING id, email', [email]);
      if (res.rowCount > 0) {
        console.log(`✅ Deleted seeded user: ${email} (ID: ${res.rows[0].id}) and all associated data.`);
      } else {
        console.log(`ℹ️ Seeded user ${email} not found. Skipping.`);
      }
    }

    console.log('🎉 Cleanup complete. No more seeded data in the live production database!');
  } catch (err) {
    console.error('❌ Database Query Error:', err.message);
  } finally {
    await pool.end();
  }
}

removeSeededData();
