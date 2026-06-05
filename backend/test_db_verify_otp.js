const db = require('./config/db');

async function test() {
  try {
    const id = 1;
    // ensure order exists
    await db.query(`insert into orders (customer_id, shop_id, order_status) values (1, 1, 'Ready For Pickup')`);
    
    const result = await db.query(
      `UPDATE orders 
       SET order_status = 'Delivered', 
           otp_verified_at = CURRENT_TIMESTAMP, 
           delivered_at = CURRENT_TIMESTAMP, 
           payment_status = 'Paid', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id]
    );
    console.log("UPDATE result:", result);
    
    const updatedOrder = result.rows[0];
    console.log("Updated order:", updatedOrder);
    
    const responseTimeSec = 100;
    const order = updatedOrder || { shop_id: 1, customer_id: 1, created_at: new Date() };
    await db.query(
      `INSERT INTO seller_performance (shop_id, response_time_avg, total_completed_orders) 
       VALUES ($1, $2, 1) 
       ON CONFLICT (shop_id) 
       DO UPDATE SET 
         response_time_avg = ROUND((seller_performance.response_time_avg * seller_performance.total_completed_orders + $2) / (seller_performance.total_completed_orders + 1)),
         total_completed_orders = seller_performance.total_completed_orders + 1`,
      [order.shop_id, responseTimeSec]
    );
    
    console.log("SUCCESS");
  } catch(e) {
    console.error("CAUGHT ERROR:", e);
  }
}
test();
