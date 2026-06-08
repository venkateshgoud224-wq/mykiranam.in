const db = require('./config/db.js');
async function test() {
  try {
    const res = await db.query('SELECT o.id, o.customer_id, u.phone as customer_phone, o.shop_id, su.phone as seller_phone FROM orders o JOIN users u ON o.customer_id = u.id JOIN shops s ON o.shop_id = s.id JOIN users su ON s.owner_id = su.id ORDER BY o.created_at DESC LIMIT 5');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
test();
