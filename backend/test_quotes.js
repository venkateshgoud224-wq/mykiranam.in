const db = require('./config/db');
const priceEngine = require('./services/priceEngine');

async function run() {
  await db.initDb();
  const mockDb = db.getMockDb();

  console.log('1. Mocking a shop and a delivered digital order...');
  const shopRes = await db.query(
    "INSERT INTO shops (owner_id, shop_name, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [1, "Test Price Shop", "123 Test St", 12.9, 77.6]
  );
  const shop = shopRes.rows[0];
  await db.query("UPDATE shops SET verification_status = 'Verified' WHERE id = $1", [shop.id]);

  const items = [
    { name: "Sugar", quantity: 2, price: 50, unit: "kg" },
    { name: "Aashirvaad Atta", quantity: 5, price: 60, unit: "kg" }
  ];

  const orderRes = await db.query(
    `INSERT INTO orders (customer_id, shop_id, order_type, modified_item_list, order_status) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [2, shop.id, 'digital', JSON.stringify(items), 'Delivered']
  );
  const order = orderRes.rows[0];

  console.log('2. Extracting prices from order...');
  await priceEngine.extractOrderPrices(order.id);

  console.log('Historical Prices DB:', mockDb.historical_prices);
  console.log('Products DB:', mockDb.products);
  console.log('Aliases DB:', mockDb.product_aliases);

  console.log('3. Testing quote generation...');
  const reqItems = [
    { name: "sugar", quantity: 3, unit: "kg" },
    { name: "ATTA", quantity: 10, unit: "kg" } // Should map to aashirvaad atta if they used the exact name, but wait, they used "ATTA", it won't map exactly unless they match. Let's see what happens.
  ];

  const quotes = await priceEngine.generateQuotes(reqItems, 2);
  console.log('Generated Quotes:\n', JSON.stringify(quotes, null, 2));
}

run();
