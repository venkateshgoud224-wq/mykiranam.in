const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mykiranam_dev',
  password: 'admin',
  port: 5432,
});

async function main() {
  try {
    const res = await pool.query("SELECT id, name, email, role, phone, verified_whatsapp FROM users ORDER BY id DESC");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
main();
