const db = require('./config/db');
const notificationEngine = require('./services/notificationEngine');

const test = async () => {
  console.log('🧪 Starting WhatsApp fallback integration test...');
  
  // 1. Initialize mock database
  await db.initDb();

  // 2. Link and verify a WhatsApp number for user id 1 (Rajesh Patel)
  console.log('🔗 Mocking WhatsApp linking for User #1 (Rajesh Patel)...');
  await db.query(
    "UPDATE users SET whatsapp_number = $1, verified_whatsapp = $2 WHERE id = $3",
    ['9876543210', true, 1]
  );

  // 3. Dispatch a mock "bill_uploaded" notification
  console.log('📡 Dispatching notification event with Rajesh marked as offline...');
  await notificationEngine.dispatchNotification(
    1,
    'Bill Uploaded',
    'Bill uploaded for your order KRN1024 at Sai Srinivasa Kirana Store. Total: ₹950.',
    'bill_uploaded',
    {
      orderId: 1024,
      amount: 950,
      shopName: 'Sai Srinivasa Kirana Store'
    }
  );

  console.log('🧪 Test run completed.');
  process.exit(0);
};

test();
