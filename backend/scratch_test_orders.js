const db = require('./config/db');

async function test() {
  console.log("Initializing DB...");
  await db.initDb();
  
  const userId = 1; // Try with admin user or seller user
  const shopId = 1;

  console.log("\nTesting customer orders query...");
  try {
    const q1 = await db.query(
      `SELECT o.*, s.shop_name, s.address as shop_address, s.latitude as shop_latitude, s.longitude as shop_longitude, s.working_hours as shop_working_hours, s.upi_id, s.qr_code_image, s.delivery_option, s.delivery_charges, s.delivery_time, s.home_delivery_ready, s.catalog_enabled as shop_catalog_enabled, COALESCE(su.phone, su.whatsapp_number) as seller_phone, u.name as customer_name, cp.status as commitment_status,
              COALESCE(ct.cancellations, 0) as cancellations
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       JOIN users u ON o.customer_id = u.id
       JOIN users su ON s.owner_id = su.id
       LEFT JOIN commitment_payments cp ON o.id = cp.order_id
       LEFT JOIN customer_trust ct ON o.customer_id = ct.customer_id
       WHERE o.customer_id = $1 
       ORDER BY o.created_at DESC`,
      [userId]
    );
    console.log("Customer query succeeded, rows count:", q1.rows.length);
  } catch (err) {
    console.error("Customer query failed:", err);
  }

  console.log("\nTesting seller orders query...");
  try {
    const q2 = await db.query(
      `SELECT o.*, s.catalog_enabled as shop_catalog_enabled, u.name as customer_name, COALESCE(u.phone, u.whatsapp_number) as customer_phone,
              COALESCE(ct.trust_score, 100) as customer_trust_score,
              COALESCE(ct.customer_level, 'Standard Customer') as customer_level,
              COALESCE(ct.successful_pickups, 0) as successful_pickups,
              COALESCE(ct.cancellations, 0) as cancellations,
              COALESCE(ct.total_orders, 0) as total_customer_orders,
              COALESCE(ct.abandoned_orders, 0) as abandoned_orders,
              CASE 
                 WHEN COALESCE(ct.total_orders, 0) > 0 
                 THEN ROUND((COALESCE(ct.successful_pickups, 0) * 100.0) / COALESCE(ct.total_orders, 1))
              END as reliability_score,
              cp.status as commitment_status
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id
       JOIN users u ON o.customer_id = u.id 
       LEFT JOIN customer_trust ct ON u.id = ct.customer_id
       LEFT JOIN commitment_payments cp ON o.id = cp.order_id
       WHERE o.shop_id = $1 
       ORDER BY o.created_at DESC`,
      [shopId]
    );
    console.log("Seller query succeeded, rows count:", q2.rows.length);
  } catch (err) {
    console.error("Seller query failed:", err);
  }
}

test();
