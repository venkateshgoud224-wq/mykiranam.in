const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mykiranam_dev',
  password: 'admin',
  port: 5432,
});

async function main() {
  const res = await pool.query("SELECT id, custom_order_id, order_status, amount FROM orders ORDER BY id DESC LIMIT 5");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
main();
