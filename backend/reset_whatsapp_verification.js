require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function resetVerifications() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ No DATABASE_URL specified in env. Assuming In-Memory fallback database is used locally.');
    
    const mockDbPath = path.join(__dirname, 'uploads', 'mockDb.json');
    if (fs.existsSync(mockDbPath)) {
      try {
        const data = fs.readFileSync(mockDbPath, 'utf8');
        const mockDb = JSON.parse(data);
        let updatedCount = 0;
        if (mockDb.users && mockDb.users.length > 0) {
          mockDb.users.forEach(user => {
            if (user.verified_whatsapp) {
              user.verified_whatsapp = false;
              updatedCount++;
            }
          });
          fs.writeFileSync(mockDbPath, JSON.stringify(mockDb, null, 2), 'utf8');
          console.log(`✅ Successfully reset verified_whatsapp to false for ${updatedCount} users in local mockDb.json.`);
        } else {
          console.log('ℹ️ No users found in local mockDb.json to reset.');
        }
      } catch (err) {
        console.error('❌ Error processing mockDb.json:', err.message);
      }
    } else {
      console.log('❌ mockDb.json not found. Nothing to update.');
    }
    
    console.log('\n---');
    console.log('ℹ️ To run this script on your PRODUCTION database, run the following command on your server:');
    console.log('   DATABASE_URL="your_production_db_url" node reset_whatsapp_verification.js');
    console.log('---');
    process.exit(0);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('⚡ Connecting to the live PostgreSQL database...');
    
    console.log('🗑️ Setting verified_whatsapp to false for all users...');
    
    const res = await pool.query('UPDATE users SET verified_whatsapp = false RETURNING id');
    console.log(`✅ Reset verified_whatsapp to false for ${res.rowCount} users in production.`);

  } catch (err) {
    console.error('❌ Database Query Error:', err.message);
  } finally {
    await pool.end();
  }
}

resetVerifications();
