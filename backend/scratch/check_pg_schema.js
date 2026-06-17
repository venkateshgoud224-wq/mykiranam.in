const db = require('../config/db');

async function run() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type, ordinal_position 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position;
    `);
    console.log("=== Columns of 'orders' table ===");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
