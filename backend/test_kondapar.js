const { getShops } = require('./controllers/shopController');
const db = require('./config/db');

async function test() {
  console.log('--- Verification Test for Hyper Market Kondapar ---');
  
  // 1. Check if the shop exists in db/mockDb
  const result = await db.query("SELECT * FROM shops WHERE shop_name = 'Hyper Market Kondapar'");
  console.log('Database Query Result size:', result.rows.length);
  if (result.rows.length > 0) {
    const shop = result.rows[0];
    console.log('Shop found in DB:', {
      id: shop.id,
      shop_name: shop.shop_name,
      address: shop.address,
      latitude: shop.latitude,
      longitude: shop.longitude,
      verified: shop.verified,
      verification_status: shop.verification_status,
      availability_status: shop.availability_status
    });
  } else {
    console.error('❌ Error: Hyper Market Kondapar not found in database.');
    process.exit(1);
  }

  // 2. Simulate getShops request with coordinates far away (e.g. HSR Layout, Bangalore - which is more than 5km away from Hyderabad)
  console.log('\n--- Simulating getShops (far coordinates) ---');
  const req = {
    query: {
      lat: '12.9141',
      lng: '77.6413',
      sort: 'nearest'
    },
    headers: {}
  };
  
  let jsonResponse = null;
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      jsonResponse = data;
      return this;
    }
  };

  await getShops(req, res);
  
  console.log('API Status Code:', res.statusCode);
  if (res.statusCode === 200 && Array.isArray(jsonResponse)) {
    console.log(`API returned ${jsonResponse.length} shops.`);
    const kondaparShop = jsonResponse.find(s => s.shop_name === 'Hyper Market Kondapar');
    if (kondaparShop) {
      console.log('✅ Success: Hyper Market Kondapar was returned in listing even though distance is:', kondaparShop.distance, 'km');
    } else {
      console.error('❌ Error: Hyper Market Kondapar was NOT returned in listing.');
      process.exit(1);
    }
  } else {
    console.error('❌ Error: API request failed with status:', res.statusCode, 'response:', jsonResponse);
    process.exit(1);
  }

  console.log('\n✅ All tests passed successfully!');
  process.exit(0);
}

test().catch(err => {
  console.error('Test threw error:', err);
  process.exit(1);
});
