require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const shopNames = process.argv.slice(2);

if (shopNames.length === 0) {
  console.log('Please provide one or more shop names to delete.');
  console.log('Usage: node delete_shops.js "Shop Name 1" "Shop Name 2"');
  process.exit(1);
}

async function removeShops() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    try {
      console.log(`⚡ Connecting to the live PostgreSQL database to delete shops...`);
      for (const shopName of shopNames) {
        const res = await pool.query('DELETE FROM shops WHERE shop_name = $1 RETURNING id, shop_name', [shopName]);
        if (res.rowCount > 0) {
          console.log(`✅ Deleted ${res.rowCount} shop(s) with name "${shopName}".`);
        } else {
          console.log(`ℹ️ No shop found with name "${shopName}".`);
        }
      }
    } catch (err) {
      console.error('❌ Database Error:', err.message);
    } finally {
      await pool.end();
    }
  } else {
    console.log('⚠️ No DATABASE_URL specified. Modifying local mockDb.json...');
    const MOCK_DB_FILE = path.join(__dirname, 'uploads', 'mockDb.json');
    if (fs.existsSync(MOCK_DB_FILE)) {
      const data = fs.readFileSync(MOCK_DB_FILE, 'utf8');
      const mockDb = JSON.parse(data);
      let totalDeleted = 0;
      
      for (const shopName of shopNames) {
        const initialLength = mockDb.shops.length;
        mockDb.shops = mockDb.shops.filter(s => s.shop_name.toLowerCase() !== shopName.toLowerCase());
        const deletedCount = initialLength - mockDb.shops.length;
        if (deletedCount > 0) {
          console.log(`✅ Deleted ${deletedCount} shop(s) with name "${shopName}" from mockDb.json.`);
          totalDeleted += deletedCount;
        } else {
          console.log(`ℹ️ No shop found with name "${shopName}" in mockDb.json.`);
        }
      }

      if (totalDeleted > 0) {
        fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(mockDb, null, 2), 'utf8');
        console.log(`🎉 Cleanup complete. Removed ${totalDeleted} shop(s) from mockDb.json.`);
      }
    } else {
      console.log('Mock database file not found.');
    }
  }
}

removeShops();
