const fs = require('fs');
const path = require('path');

const mockDbPath = path.join(__dirname, 'uploads/mockDb.json');
if (fs.existsSync(mockDbPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
    data.orders = [];
    data.notifications = [];
    if (data.shops) {
      data.shops.forEach(shop => {
        shop.active_orders = 0;
        shop.waiting_time = 0;
        if (shop.availability_status === 'Busy') {
          shop.availability_status = 'Available';
        }
      });
    }
    fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ Mock database orders and notifications successfully cleared!');
  } catch (e) {
    console.error('❌ Error updating mockDb.json:', e.message);
  }
} else {
  console.log('❌ mockDb.json not found in backend/uploads/.');
}
