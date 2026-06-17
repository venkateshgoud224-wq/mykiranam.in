const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '../uploads/mockDb.json');
if (fs.existsSync(dbFile)) {
  const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  console.log('Total Orders:', data.orders.length);
  data.orders.forEach(o => {
    console.log(`Order ID: ${o.id}, Customer ID: ${o.customer_id}, Status: ${o.order_status}`);
  });
} else {
  console.log('mockDb.json does not exist');
}
