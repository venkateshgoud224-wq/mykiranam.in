const db = require('./config/db');

async function run() {
  await db.initDb();
  const res = await db.query('SELECT id, shop_name, image_banner FROM shops LIMIT 5');
  console.log(res.rows);
}

run();
