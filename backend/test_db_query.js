const db = require('./config/db');

async function run() {
  console.log("Initializing DB...");
  await db.initDb();
  const mockDb = db.getMockDb();

  // 1. Register new seller (equivalent to INSERT INTO users)
  console.log("\n1. Registering new seller...");
  const sellerRes = await db.query(
    "INSERT INTO users (role, name, email, password, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    ['seller', 'Crew Canvas', 'seller_canvas@gmail.com', 'hashedpassword', '9999999999']
  );
  const seller = sellerRes.rows[0];
  console.log("New Seller Registered:", seller);

  // 2. Creating default shop for seller (like authController does)
  console.log("\n2. Creating default shop for seller...");
  const shopRes = await db.query(
    "INSERT INTO shops (owner_id, shop_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [seller.id, "Crew Canvas Shop", "Sector 3, HSR Layout, Bangalore, Karnataka 560102", 12.9141, 77.6413]
  );
  const shop = shopRes.rows[0];
  console.log("New Shop Created:", shop);

  // 3. Admin verifying shop (updates verification_status to Verified)
  console.log("\n3. Admin verifying shop...");
  const verifyRes = await db.query(
    "UPDATE shops SET verification_status = $1, verified_by_admin = $2 WHERE id = $3 RETURNING *",
    ['Verified', true, shop.id]
  );
  console.log("Verified Shop:", verifyRes.rows[0]);

  // 4. Customer placing order at new shop
  console.log("\n4. Placing order at new shop...");
  const orderRes = await db.query(
    `INSERT INTO orders (customer_id, shop_id, original_chitti, notes, preferred_pickup_time, order_status) 
     VALUES ($1, $2, $3, $4, $5, 'Waiting For Seller') 
     RETURNING *`,
    [1, shop.id, '/uploads/chitti_canvas.jpg', '5kg Sugar', 'Flexible']
  );
  const order = orderRes.rows[0];
  console.log("Order placed:", order);

  // 5. Seller retrieving order details (joined with shop)
  console.log("\n5. Seller retrieving order details via select join query...");
  const selectRes = await db.query(
    `SELECT o.*, s.owner_id as seller_user_id, s.shop_name 
     FROM orders o 
     JOIN shops s ON o.shop_id = s.id 
     WHERE o.id = $1`,
    [order.id]
  );
  const retrievedOrder = selectRes.rows[0];
  console.log("Retrieved Order:", retrievedOrder);

  // 6. Performing authorization check
  console.log("\n6. Performing Auth Check...");
  const sellerId = seller.id;
  console.log("retrievedOrder.seller_user_id:", retrievedOrder.seller_user_id, "type:", typeof retrievedOrder.seller_user_id);
  console.log("sellerId:", sellerId, "type:", typeof sellerId);
  console.log("Number(retrievedOrder.seller_user_id) === Number(sellerId):", Number(retrievedOrder.seller_user_id) === Number(sellerId));
}

run();
