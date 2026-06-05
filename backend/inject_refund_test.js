const fs = require('fs');
const path = require('path');

const mockDbPath = path.join(__dirname, 'uploads', 'mockDb.json');

try {
  const data = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
  
  // Create a mock cancelled order
  const newOrder = {
    id: Date.now(),
    custom_order_id: `MOCK-${Math.floor(Math.random() * 10000)}`,
    shop_id: 1, // Assuming shop 1 exists
    customer_id: 1, // Assuming customer 1 exists
    customer_name: "Test Customer (Refund Test)",
    shop_name: "Test Shop",
    amount: "150.00",
    order_status: "Cancelled",
    payment_status: "Paid",
    payment_method: "Razorpay UPI",
    razorpay_payment_id: "pay_fake1234567890", // Razorpay will reject this but the UI will work
    order_type: "list",
    notes: "Customer cancelled after paying.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  data.orders.unshift(newOrder);
  
  fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ Successfully injected a mock cancelled order for refund testing!');
} catch(e) {
  console.error('Failed to inject order:', e);
}
