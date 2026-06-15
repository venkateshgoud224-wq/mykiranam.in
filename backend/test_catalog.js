const db = require('./config/db');
const assert = require('assert');

const runTests = async () => {
  console.log('🧪 Starting catalog database integration tests...');
  console.log(`Database fallback mode: ${db.getIsMock()}`);
  
  try {
    if (!db.getIsMock()) {
      await db.query("DELETE FROM seller_products WHERE product_name = 'Test Rice' OR product_name = 'Test Sugar'");
    } else {
      const mockDb = db.getMockDb();
      mockDb.seller_products = [];
    }

    console.log('Testing manual product creation...');
    const insertRes = await db.query(
      'INSERT INTO seller_products (shop_id, seller_id, product_name, category, price, quantity, unit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [1, 2, 'Test Rice', 'Groceries', 60.00, 100.0, 'KG']
    );
    assert.strictEqual(insertRes.rows.length, 1);
    assert.strictEqual(insertRes.rows[0].product_name, 'Test Rice');
    assert.strictEqual(Number(insertRes.rows[0].price), 60);
    assert.strictEqual(Number(insertRes.rows[0].quantity), 100);
    console.log('✅ Manual product creation passed.');

    console.log('Testing product lookup by name (case-insensitive)...');
    const selectRes = await db.query(
      'SELECT * FROM seller_products WHERE shop_id = $1 AND LOWER(product_name) = LOWER($2)',
      [1, 'test rice']
    );
    assert.strictEqual(selectRes.rows.length, 1);
    assert.strictEqual(selectRes.rows[0].product_name, 'Test Rice');
    console.log('✅ Product lookup by name passed.');

    console.log('Testing product update details...');
    const prodId = insertRes.rows[0].id;
    const updateRes = await db.query(
      'UPDATE seller_products SET category=$1, price=$2, quantity=$3, unit=$4 WHERE id=$5 RETURNING *',
      ['Groceries', 65.00, 80.0, 'KG', prodId]
    );
    assert.strictEqual(updateRes.rows.length, 1);
    assert.strictEqual(Number(updateRes.rows[0].price), 65);
    assert.strictEqual(Number(updateRes.rows[0].quantity), 80);
    console.log('✅ Product update details passed.');

    console.log('Testing product delete...');
    const deleteRes = await db.query(
      'DELETE FROM seller_products WHERE id = $1 AND shop_id = $2 RETURNING *',
      [prodId, 1]
    );
    assert.strictEqual(deleteRes.rows.length, 1);
    
    // Verify removal
    const selectAfterDelete = await db.query('SELECT * FROM seller_products WHERE shop_id = $1', [1]);
    assert.strictEqual(selectAfterDelete.rows.length, 0);
    console.log('✅ Product delete passed.');

    console.log('\n🎉 ALL DATABASE INTEGRATION TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Tests failed:', err);
    process.exit(1);
  }
};

runTests();
