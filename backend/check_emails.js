require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkEmails() {
  try {
    const res = await pool.query('SELECT id, role, name, email FROM users');
    console.log("USERS IN DB:");
    console.table(res.rows);

    const shopRes = await pool.query('SELECT id, owner_id, shop_name FROM shops');
    console.log("SHOPS IN DB:");
    console.table(shopRes.rows);

    const orderRes = await pool.query('SELECT id, custom_order_id, customer_id, shop_id FROM orders ORDER BY id DESC LIMIT 5');
    console.log("LATEST ORDERS:");
    console.table(orderRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkEmails();
