const db = require('./config/db');

async function test() {
  try {
    console.log("Mock status:", db.isMock);
    
    // Let's call the query that shopController.updateShopSettings runs:
    const result = await db.query(
      `UPDATE shops 
       SET shop_name = $1, address = $2, latitude = $3, longitude = $4, availability_status = $5, 
           max_active_orders = $6, waiting_time = $7, discounts = $8, online_start_time = $9, online_end_time = $10,
           working_hours = $11, shop_category = $12, delivery_option = $13, delivery_charges = $14, delivery_time = $15,
           home_delivery_ready = $16, catalog_enabled = $17
       WHERE id = $18 
       RETURNING *`,
      [
        "Sai Srinivasa Kirana Store", // shop_name
        "Sector 3, HSR Layout, Bangalore", // address
        12.9141, // latitude
        77.6413, // longitude
        "Available", // availability_status
        10, // max_active_orders
        15, // waiting_time
        "Discounts", // discounts
        "08:00", // online_start_time
        "22:00", // online_end_time
        "08:00 - 22:00", // working_hours
        "General Provisions", // shop_category
        "Pickup + Delivery", // delivery_option
        25.00, // delivery_charges
        "30-45 mins", // delivery_time
        false, // home_delivery_ready
        false, // catalog_enabled
        1 // shop.id
      ]
    );
    console.log("Query success! Result:", result);
  } catch (err) {
    console.error("Query failed with error:", err);
  }
}

test();
